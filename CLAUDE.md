# CLAUDE.md

## Project

Survey platform that helps users reflect on their current financial situation and encourages them to talk to the sponsoring Financial Consultants. It orients the conversation and generates leads for the consultants.

**Hard compliance rule: the survey and website NEVER give financial advice of any kind** (no recommendations, product suggestions, projections, or "you should…" statements). Only the registered, sponsoring consultants may do that, 1:1 with clients. Results/copy must stay descriptive and orientational, and always point to a consultant conversation. Treat any copy or logic that could read as advice as a bug.

## Stack

- SvelteKit with **Svelte 5 runes** (`$state`, `$derived`, `$effect`, `$props`) — no legacy `let`-reactivity, `export let`, or `$:`.
- Supabase (Postgres, Auth, RLS) — local config in `supabase/`, CLI pinned as a dev dependency (run via `npx supabase`).
- Vercel for hosting (CLI: `vercel`; MCP: https://mcp.vercel.com).
- Tooling: TypeScript, Tailwind v4 (+forms), Vitest, ESLint/Prettier, `@sveltejs/adapter-vercel`, `@supabase/ssr`. SvelteKit config lives in `vite.config.ts` (no `svelte.config.js`).
- Status: the 18-scheda survey (S04 only for the self-employed), shown one question per screen (chapter screen, a sheet intro, then each visible question; sheets are an implementation detail, steps are browser history entries, `src/lib/survey/screens.ts`, transitions in `src/lib/components/motion.ts`), the map engine (`src/lib/map/`), the four-page PDF (`src/lib/server/pdf/`), and the profile page (consent and GDPR rights: withdraw, data export, account deletion) are built. There is no self-service PDF download: PDFs are printed by admins at the event, or emailed by them to the respondent (`src/lib/server/map-mail.ts`, nodemailer over the same SMTP account Supabase Auth uses; `SMTP_*` env vars, Mailpit locally). Survey metrics (`/admin/statistiche`, aggregated CSV export): the page posts batches to `POST /api/eventi` (`src/lib/metrics/`, contract in `events.ts`); before the consent gate only anonymous "screen reached" counters are stored (`survey_screen_counts`, nothing written on the device), after it screen leaves (outcome, visible time) go to a random-id journey (`survey_journeys`, `survey_journey_events`) whose only link to the person, `survey_journey_owners`, is dropped 30 days after the last event (pg_cron) or with the account; admin traffic is not counted; the endpoint is rate-limited by a Vercel Firewall rule (DEPLOY.md 1.9). A consenting respondent resumes on any device: the survey page loads the server answers and merges them per sheet (server wins). **Ready for production:** Mauro and Chiara signed off the questionnaire and every map rule (rules 1.0.0, all `approved: true`); a new or changed rule goes back to `approved: false` (draft mode only) until they sign it off again. Content source of truth: `docs/map-spec.md`.
- Auth: no links anywhere. The gate signs respondents in anonymously (Supabase anonymous sign-ins) so answers are saved server-side; the email is verified at `/profilo` with a 6-digit emailed code (`src/lib/server/sign-in.ts`), merging into an existing account via `merge_anonymous_respondent` when the address is already registered. Unverified anonymous respondents are purged after 7 days (pg_cron). Admins (event staff) are the addresses in `public.admins`, synced from `ADMIN_EMAILS` before each Vercel build (`scripts/seed-admins.ts`, `vercel.json`); they sign in with the same code at `/profilo`, which links them to `/admin` (search consenting verified respondents, open their map PDF to print). `hooks.server.ts` guards everything under `/admin`. An admin's account cannot be deleted while listed (database trigger); `scripts/remove-admins.ts` (`just remove-admins`) unlists admins, or with `--purge --yes` deletes their accounts too. Cloudflare Turnstile guards anonymous sign-in and code sending; Supabase checks it (secret in `supabase/.env`, see `supabase/.env.example`; site key `PUBLIC_TURNSTILE_SITE_KEY`).

## Language

- **User-facing text (survey, website, emails) is in Italian.** Keep copy in one place (i18n/messages module), not scattered in components.
- Code, identifiers, comments, commit messages, and this file are in English.

## Commands

A `justfile` wraps the common ones (`just` lists them; `just verify` runs check, lint, test and build).

- `npx supabase start` / `stop` / `db reset` — local Supabase stack
- `npx supabase migration new <name>` — schema changes go through migrations only
- `vercel` / `vercel --prod` — deploy (requires `vercel login`)
- `npm run dev` / `build` / `preview` — app
- `just rulebook` (writes `docs/rulebook.md`), `just samples` (nine persona PDFs in `.samples/`)
- Map env vars: `MAP_DRAFT=1` (render in draft mode). The PDF and the map email link to the fixed contact page in `closing.contactUrl` (`src/lib/content/map-layout.it.ts`)
- `npm run check` (svelte-check), `npm run lint`, `npm run format`, `npm test` (Vitest)

## Data and security notes

- Survey answers and lead contact details are personal (and potentially financial) data under GDPR: enable RLS on every table, no public read access, collect only what is needed, and record consent explicitly.
- Every new table's migration grants its privileges explicitly (`service_role`, and `authenticated` only for what its policies allow; see the "Privileges" section of `20261111000000_initial_schema.sql`). The hosted project has no default grants on `public`, unlike the local stack, so a table that works locally can be unusable in production.
- Never expose the Supabase secret key (`SUPABASE_SECRET_KEY`, `sb_secret_...`; it acts as the service role and bypasses RLS) to the client; server-only code (`+page.server.ts`, `hooks.server.ts`, scripts) uses it, and only when RLS cannot express the need. Legacy JWT `service_role` keys are not used.
- Secrets live in `.env` / Vercel env vars, never in git.
