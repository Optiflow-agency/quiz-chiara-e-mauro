# DEPLOY.md

How to put the survey in production the first time, and how to ship changes afterwards.

The production system has four parts, each configured separately:

| Part                 | What it holds                                                    | Configured in                         |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Supabase (hosted)    | Postgres schema, RLS, Auth (anonymous + email code), pg_cron     | `supabase/migrations/`, the dashboard |
| Vercel               | The SvelteKit app (`@sveltejs/adapter-vercel`), env vars, domain | `vercel.json`, the dashboard / CLI    |
| Cloudflare Turnstile | Bot check on anonymous sign-in and on code sending               | Cloudflare dashboard                  |
| SMTP provider        | Auth codes (sent by Supabase) and map emails (sent by the app)   | Provider dashboard, DNS               |

> `supabase/config.toml` describes the **local** stack only. Hosted Supabase does not read it: every
> Auth setting below must be set on the hosted project by hand (see 1.4). Do not run
> `npx supabase config push` against production: it would push local values such as
> `site_url = "http://127.0.0.1:5173"`.

All app env vars are read at runtime (`$env/dynamic/*`), but Vercel only applies env var changes to
**new** deployments: after changing one, redeploy.

---

## 0. Prerequisites

- Node 24 (`node -v`; `scripts/seed-admins.ts` runs as plain TypeScript, which needs Node ≥ 22.18).
- `npm install` done; the Supabase CLI is a dev dependency (`npx supabase --version`).
- `just` (optional, wraps the commands below) and the Vercel CLI (`npm i -g vercel@latest`).
- Accounts / access: Supabase organization, Vercel team, Cloudflare account, an SMTP provider, and
  DNS control over the production domain.
- A green tree: `just verify` (check, lint, test, build).

Keep the production values in a local, git-ignored `.env.prd` (same keys as `.env.example`). It is
what the developer scripts read when they must target production (see 2.5). Never commit it.

---

## 1. First deployment

Do the steps in order: later steps need values produced by earlier ones.

### 1.1 Domain and sender address

Decide up front:

- the production URL, e.g. `https://example.it` (call it `PROD_URL` below; the app does not read it, the map and its email
  link to the fixed contact page `https://mauroschileo.it/contatti/`);
- the sender address for all emails, e.g. `mappa@example.it`, on a domain you control.

### 1.2 SMTP provider

Supabase's built-in mailer is rate-limited to a handful of emails per hour and is not meant for
production; both Supabase Auth and the app must use a real SMTP account.

1. Create an account with an SMTP provider that has an EU data region (GDPR), and verify the
   sending domain.
2. Add the DNS records the provider asks for: **SPF**, **DKIM**, and a **DMARC** record
   (`_dmarc.example.it`, at least `v=DMARC1; p=none; rua=mailto:...`). Without them the codes land
   in spam.
3. Create SMTP credentials and note: host, port, user, password.
   - Port `465`: TLS from the start. Any other port (usually `587`): STARTTLS
     (`src/lib/server/mail.ts`).
4. Turn off any IP allow-list on the SMTP account (Brevo: Security > Authorized IPs). Supabase Auth
   and Vercel functions connect from changing cloud IPs, so a list cannot be kept current; with it
   on, sending fails with `525 5.7.1 Unauthorized IP address` (a 500 on `/auth/v1/otp`).

The same credentials go to Supabase (1.4) and to Vercel (1.7).

### 1.3 Supabase project

1. In the Supabase dashboard create a new project in an **EU region** (e.g. Frankfurt, `eu-central-1`).
   Save the database password in your password manager.
2. Note the **project ref** (Project Settings > General) and the **Project URL**
   (`https://<ref>.supabase.co`).
3. Link the repo and apply the migrations:

   ```sh
   npx supabase login
   npx supabase link --project-ref <ref>          # asks for the database password
   npx supabase db push --dry-run                 # lists the migrations it would apply
   npx supabase db push
   npx supabase migration list                    # Local and Remote columns must match
   ```

   The migrations create the tables with RLS, the `admins` table, `merge_anonymous_respondent`, the
   survey metrics tables (`survey_screen_counts`, `survey_journeys`, `survey_journey_events`,
   `survey_journey_owners`), and enable the `pg_trgm`, `moddatetime` and `pg_cron` extensions.

4. Check that the retention jobs exist (SQL Editor):

   ```sql
   select jobname, schedule, active from cron.job;
   -- purge-unverified-respondents | 17 3 * * * | t
   -- unlink-survey-journeys       | 27 3 * * * | t
   ```

5. API keys (Project Settings > API Keys):
   - copy the **publishable key** (`sb_publishable_...`) → `PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - create a **secret key** named `vercel` (`sb_secret_...`) → `SUPABASE_SECRET_KEY` on Vercel;
   - create one more secret key per developer who needs to run scripts against production (e.g.
     `dev-<name>`), stored in their `.env.prd`. Separate keys can be revoked one at a time.
   - Legacy JWT `anon` / `service_role` keys are not used; they can be disabled.

### 1.4 Supabase Auth settings (dashboard)

Mirror the local `supabase/config.toml` on the hosted project.

**Authentication > URL Configuration**

- Site URL: `PROD_URL`. No redirect URLs are needed (the app never sends links).

**Authentication > Sign In / Providers**

- Allow new users to sign up: **on**.
- Allow anonymous sign-ins: **on** (the gate signs respondents in anonymously).
- Manual linking: off.
- Email provider: **enabled**, Confirm email: **on**, Secure email change: **on**.
- Email OTP length: **6**; Email OTP expiration: **600** seconds.
- All other providers (phone, OAuth, Web3): off.

**Authentication > Attack Protection**

- Enable CAPTCHA protection, provider **Cloudflare Turnstile**, secret key from 1.5. (You can do
  1.5 first and come back.) Leaving it off is not an option: the app sends captcha tokens and the
  real widget only works with the matching secret.

**Authentication > Emails > SMTP Settings**

- Enable custom SMTP with the credentials from 1.2; sender email and name as in `SMTP_FROM`
  (e.g. name `Guadagnare non basta+`, address `mappa@example.it`).

**Authentication > Rate Limits**

- After enabling custom SMTP, raise "emails sent per hour" to what the event needs (several
  hundred, e.g. one code per attendee plus resends). Keep the other limits as default unless the
  event traffic requires more (e.g. anonymous sign-ins per hour from one venue IP: the local value
  is 500).

**Authentication > Emails > Templates**

Paste the HTML from `supabase/templates/` and set the subject on each. All three use `{{ .Token }}`
(the 6-digit code), never a link.

| Template             | File                                   | Subject                        |
| -------------------- | -------------------------------------- | ------------------------------ |
| Confirm signup       | `supabase/templates/confirmation.html` | `{{ .Token }} è il tuo codice` |
| Magic Link           | `supabase/templates/magic_link.html`   | `{{ .Token }} è il tuo codice` |
| Change Email Address | `supabase/templates/email_change.html` | `{{ .Token }} è il tuo codice` |

### 1.5 Cloudflare Turnstile

1. Cloudflare dashboard > Turnstile > Add widget.
2. Hostnames: the production domain (and `<project>.vercel.app` if you want to test on it before
   the domain is live).
3. Widget mode: **Invisible** (matches the local test key `1x00000000000000000000BB`).
4. Copy the **site key** → `PUBLIC_TURNSTILE_SITE_KEY` on Vercel.
5. Copy the **secret key** → Supabase, Attack Protection (1.4). The secret never goes to Vercel or
   to git.

### 1.6 Vercel project

The repo is already linked to the Vercel project `mauro-chiara-survey` (`.vercel/project.json`,
git-ignored). On a fresh clone:

```sh
vercel login
vercel link            # pick the team and the existing project mauro-chiara-survey
```

Project settings (dashboard > Settings):

- **Framework preset**: SvelteKit (detected). Build command comes from `vercel.json`
  (`node scripts/seed-admins.ts && npm run build`); leave the dashboard override empty.
- **Node.js version**: 24.x.
- **Functions > Region**: the region closest to the Supabase project (Frankfurt → `fra1`). Each
  request talks to the database several times; a cross-ocean default region makes everything slow.
- **Git**: if the GitHub repo is connected, pushes to `main` deploy to production and other branches
  get preview deployments. See 1.7 about what previews may access.

### 1.7 Vercel environment variables

Set these for the **Production** environment (`vercel env add <NAME> production`, or the dashboard).

| Name                              | Value                                        | Notes                              |
| --------------------------------- | -------------------------------------------- | ---------------------------------- |
| `PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`                  | public by design                   |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`                         | public by design                   |
| `SUPABASE_SECRET_KEY`             | `sb_secret_...` (the `vercel` key)           | **Sensitive**; bypasses RLS        |
| `PUBLIC_TURNSTILE_SITE_KEY`       | site key from 1.5                            | public by design                   |
| `ADMIN_EMAILS`                    | `a@example.it, b@example.it`                 | event staff; synced on every build |
| `SMTP_HOST`                       | from 1.2                                     |                                    |
| `SMTP_PORT`                       | `465` or `587`                               |                                    |
| `SMTP_USER`                       | from 1.2                                     |                                    |
| `SMTP_PASS`                       | from 1.2                                     | **Sensitive**                      |
| `SMTP_FROM`                       | `"Guadagnare non basta+ <mappa@example.it>"` | same sender as Supabase SMTP       |
| `MAP_DRAFT`                       | **leave unset**                              | see below                          |

Mark `SUPABASE_SECRET_KEY` and `SMTP_PASS` as **Sensitive** (write-only in the dashboard).

**`MAP_DRAFT`.** All rules are approved (rules 1.0.0). With `MAP_DRAFT` unset, only approved
readings print, so a rule changed later and set back to `approved: false` drops out of the map until
it is signed off again; with `MAP_DRAFT=1` every PDF carries the BOZZA mark. Never set it in
production for a real event.

**Preview deployments.** `scripts/seed-admins.ts` runs on **every** build, previews included, and
rewrites `public.admins` in whatever database the build points at. So either:

- give the Preview environment none of these variables and do not use previews (simplest); or
- create a separate **staging** Supabase project (repeat 1.3–1.5 with its own keys and Turnstile
  hostname `*.vercel.app`) and give its values to the Preview environment.

Never give Preview deployments the production `SUPABASE_SECRET_KEY`.

### 1.8 First production deploy

```sh
just verify
vercel --prod          # or: just deploy-prod, or push to main if Git is connected
```

In the build log, look for `seed-admins: N admin(s) in place`. If it says
`PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required`, the env vars are missing for that
environment.
If it says `permission denied for table admins`, the hosted database lacks the table grants: check
that `npx supabase migration list` shows `initial_schema` as applied remotely (`db push`).

### 1.9 Firewall rule for the metrics endpoint

`POST /api/eventi` collects the survey metrics and accepts writes without a session (anonymous
"screen reached" counters, before the consent gate). The server validates every item strictly, but
nothing there stops a flood of valid requests, so rate-limit it at the edge. Vercel dashboard >
the project > Firewall > Configure > New Rule:

- Name: `metrics rate limit`.
- If: Request Path **equals** `/api/eventi` (and Method equals `POST`).
- Then: **Rate Limit**, fixed window, **300 requests per 60 seconds**, key **IP Address**, action
  **Deny** (429). One respondent sends at most a few batches a minute, but at the event many
  attendees share the venue's IP: size the limit for the expected concurrent respondents (about 5
  per person per minute) before a large event.
- Save, then **Review Changes > Publish**.

The rule lives in the Vercel project, not in git: repeat it on a new project or a staging project.
Check: `for i in $(seq 320); do curl -s -o /dev/null -w '%{http_code}\n' -X POST $PROD_URL/api/eventi -d '{}'; done | sort | uniq -c`
shows some `429`s.

### 1.10 Custom domain

1. Vercel > Settings > Domains > add the domain (and `www.` redirect if wanted).
2. Add the DNS records Vercel shows; wait for the certificate.
3. Check that the Supabase Site URL (1.4) and the Turnstile hostnames (1.5) use this exact domain.

### 1.11 Smoke test (on the production URL)

Use a real inbox you control, then clean up.

1. Open the site; the welcome screen loads with no console errors.
2. Answer S01–S03 and pass the consent gate (email + consent; Turnstile invisible). Answer a few
   more questions; reload: answers are kept (server-side, anonymous user).
3. Go to `/profilo`, enter the email: the 6-digit code arrives (check sender, subject, not spam);
   entering it verifies the account. Consents show and can be changed.
4. In a private window (or another device), sign in at `/profilo` with the same address: the
   survey resumes at the first unanswered question with the same answers.
5. Sign in with an `ADMIN_EMAILS` address: `/profilo` links to `/admin`. Search the test
   respondent (needs the consent), open the map PDF (no BOZZA mark), send it by email and check it
   arrives with the attachment.
6. Open `/admin` while signed out or as a non-admin: refused.
7. `/admin/statistiche` shows the test respondent's visit and journey (as a non-admin; the admin's
   own traffic is not counted). The CSV export downloads.
8. In the Supabase dashboard (Authentication > Users) the test users exist; in the SQL Editor
   `select * from cron.job_run_details order by start_time desc limit 5;` shows the purge and unlink
   jobs after their first night.
9. Delete the test respondent from `/profilo` (account deletion), or from the dashboard.

### 1.12 Before the event

- [x] Questionnaire and rules signed off by Mauro and Chiara, `approved: true` in the code
      (rules 1.0.0, 2026-11-11).
- [ ] `MAP_DRAFT` unset in Production.
- [ ] `ADMIN_EMAILS` lists exactly the event staff.
- [ ] Rate limits sized for the attendance (1.4); a test of several sign-ups from the same network.
- [ ] Supabase plan: a paid plan gives daily backups (and PITR as an add-on); the free plan pauses
      inactive projects and has no backups you can restore yourself.
- [ ] Privacy policy / consent copy reviewed; no copy reads as financial advice (CLAUDE.md).
- [ ] **Legal sign-off on the survey metrics** (blocking): the privacy notice states the purpose
      "statistiche aggregate sull'uso del questionario" and its legal basis (proposed: legitimate
      interest), confirmed by Mauro and Chiara's privacy advisor / DPO. Post-gate journeys are
      pseudonymous personal data until unlinked (30 days after the last event).
- [ ] Firewall rule on `/api/eventi` published and sized for the attendance (1.9).

---

## 2. Updating

### 2.1 Routine release (code only)

```sh
git pull
just verify
vercel --prod          # or push to main if Git is connected
```

Then repeat the parts of the smoke test (1.11) that touch what changed.

### 2.2 Release with database changes

Schema changes go through migrations only (`just db-migration <name>`, never edits in the hosted
dashboard). Locally:

```sh
just db-reset          # recreate the local DB from all migrations: they apply cleanly from zero
just db-lint
just verify
```

The database and the app cannot switch at the same instant, so write migrations the running app
survives: **migrate first, deploy second**, with additive changes (new tables, nullable columns,
new functions). Removing or renaming something the current app uses takes two releases: first ship
code that no longer uses it, then the migration that drops it.

```sh
npx supabase link --project-ref <ref>   # once per clone
npx supabase db push --dry-run          # check exactly which migrations will run
npx supabase db push
npx supabase migration list             # Local and Remote match
vercel --prod
```

Never edit a migration that has already been pushed; add a new one.

### 2.3 Env var changes

```sh
vercel env rm <NAME> production
vercel env add <NAME> production
vercel --prod          # or redeploy the latest production deployment from the dashboard
```

The change only takes effect on the new deployment.

### 2.4 Adding admins

1. Add the address to `ADMIN_EMAILS` in Vercel (and in `.env.prd`).
2. Redeploy (2.3). The build syncs `public.admins`.
3. The person signs in at `/profilo` with that address and sees the link to `/admin`.

### 2.5 Removing admins

Removing an address from `ADMIN_EMAILS` and redeploying unlists it (the sync removes every admin
not listed). The account stays as a normal respondent account. To unlist without waiting for a
deploy, or to delete the account too, run the script against production with the `.env.prd` keys:

```sh
node --env-file=.env.prd scripts/remove-admins.ts "a@example.it"                  # unlist only
node --env-file=.env.prd scripts/remove-admins.ts "a@example.it" --purge          # dry run
node --env-file=.env.prd scripts/remove-admins.ts "a@example.it" --purge --yes    # delete account and data
```

The script prints the target URL first: check it is the one you mean. (`just remove-admins` reads
`.env`, i.e. the local stack.) Also take the address out of `ADMIN_EMAILS`, or the next deploy lists
it again.

### 2.6 Email template, SMTP or Auth changes

Editing `supabase/templates/*.html` or `supabase/config.toml` changes only the local stack. Repeat
the change on the hosted project by hand (1.4), then send yourself a code to check it. SMTP
credential changes go to both Supabase (1.4) and Vercel (2.3).

### 2.7 Approving map rules

Rule approval is a code change (`approved: true` in the rules, see `docs/map-spec.md`): regenerate
the review material if useful (`just rulebook`, `just samples`), then a routine release (2.1).
`MAP_DRAFT` stays unset.

### 2.8 Rollback

- **App**: `vercel rollback` (or dashboard > Deployments > a previous production deployment >
  Promote/Instant Rollback). Immediate, no rebuild, so `seed-admins` does not run.
- **Database**: migrations are not rolled back automatically. Write a new migration that undoes the
  change and push it. For data loss, restore a Supabase backup (paid plans; Database > Backups).
  Because migrations are additive (2.2), rolling back the app alone is usually enough.

### 2.9 Rotating secrets

- **Supabase secret key**: create a new secret key, put it in Vercel (2.3), redeploy, check the
  site, then delete the old key in the dashboard. Same for a developer key in `.env.prd`.
- **SMTP password**: change it at the provider, then update Supabase SMTP settings and
  `SMTP_PASS` on Vercel, redeploy.
- **Turnstile secret**: rotate in Cloudflare, paste the new secret in Supabase Attack Protection.
  The site key does not change.

### 2.10 Keeping tools current

- Supabase CLI: bump the `supabase` dev dependency; the hosted project upgrades Postgres on its own
  schedule (dashboard notices).
- Node: when Vercel changes the default, update the project's Node version and test locally with
  the same major.
