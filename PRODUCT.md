# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
SvelteKit (Svelte 5 runes, TypeScript), Tailwind v4, Supabase (Postgres/Auth/RLS), deployed on Vercel. Chosen by the user. See CLAUDE.md.

## Users
Ticket holders of the live event "Guadagnare non basta+" (21 Nov 2026, H-FARM Campus, Roncade): professionals and entrepreneurs with accumulated assets (accounts, investments, real estate, insurance, pensions) but no integrated strategy, often couples or business partners. They complete the survey **before the event**. Italian speakers. The event explicitly is not for people seeking quick product recommendations or risk-free returns.

## Product Purpose
A pre-event survey that helps attendees take stock of their current financial/patrimonial situation and prepares the conversation with the sponsoring Financial Consultants. On completion the respondent sees a completion screen; a four-page **PDF map** ("La tua mappa finanziaria") is generated per respondent and **printed at the event** to support 1:1 discussion. It orients and fosters discussion with prospects, ultimately generating leads for the consultants. Success = completed surveys that make the in-person consultant conversation easier.

## The Map
Four A4 pages, built from the answers by computed facts (interval arithmetic on the amount bands) and fixed, pre-approved sentence templates (no free generation): (1) "La tua mappa in breve": the starting point (family, role of the income, work, property), four computed numbers (what is left at month end, how long the reserve lasts, instalments over a year, three months of fixed spending and instalments), the six areas with a state ("Quadro completo", "Quadro parziale", "Quadro da ricostruire", "Non compilata"), up to three points to look at, the goals in one sentence, and what the person reading the map with them should know (how the investments were chosen, the one aspect they would improve, their own question); (2-3) the six areas (income and spending, reserve, debts, savings, protection, pension), each a short paragraph of computed facts and tiered readings, with the perspective tags of its sentences; (4) "Per andare avanti": questions to bring, what to have at hand, and the closing invitation with a QR code to the contact page (`https://mauroschileo.it/contatti/`). The map never lists what the respondent did not know; a missing figure only appears as what it stops the map from computing. Content, rules and wording live in `docs/map-spec.md`; the questionnaire and every rule are approved (rules 1.0.0).
**Delivery.** The map is printed at the event. There is no self-service download: the profile page only manages the consent and GDPR rights (withdraw, data export, account deletion).

**Out of scope for now:** the admin print batch (printing all maps for the event), and consultant accounts (consultants have no login; requests are stored but not yet exposed to them).

## Positioning
The consultants' own event ecosystem: the survey is the pre-event step of the "Patrimonial Map" idea (an orientative diagnostic across five perspectives named on the event site: clarity, coherence, strategy, protection, succession). Whether the survey maps onto exactly these five perspectives is not yet confirmed.

## Operating Context
- Event site (reference for brand and tone): https://www.mauroechiaralive.com/biglietti
- Event: half-day workshop, max 300 participants, tiers Standard / VIP (with private post-event consultation) / Couple VIP.
- Speakers: Mauro Schileo (financial consultant, 17+ years; registered in the Albo unico, agent exclusively for Südtirol Bank S.p.A. per the event site) and Chiara Pieralli (financial educator, 600K+ followers).
- Per-respondent PDFs are printed on site during the event.

## Capabilities and Constraints
- **Hard legal rule: no financial advice of any kind.** No recommendations, product suggestions, projections, or "you should" statements in questions, results, PDF, or copy. Only the registered, sponsoring consultants may advise, 1:1. Output is descriptive and orientational and points to the consultant conversation.
- All user-facing text is in Italian; code and comments in English.
- Personal and potentially financial data (GDPR): explicit consent, minimal collection, RLS everywhere.
- Must follow the design language of the event website above.
- Respondents give their email and consents at a gate inside the survey, which unlocks it at once (an anonymous session; answers stay on the device until then, on the server afterwards). They verify the email at the end with a 6-digit code typed back into the page, never a link; unverified respondents are purged after 7 days. One consent is recorded, and it is required: processing the data to prepare the map and share it with the event's professionals, which is the service itself (part of its terms). The platform sends no promotional communications, so it asks no consent for them.
- **Undecided:** which consultants receive leads and how leads are routed/assigned; the sign-off of every rule and text by Mauro and Chiara; whether and how respondents are linked to ticket purchases; consent and privacy-policy wording (needs legal review).

## Brand Commitments
Follow the event site's design language and voice. Verified against the site's stylesheets on 2026-10-01: navy `#0B2545` and deep navy `#071A33` grounds with a faint crosshair grid, white text on dark, brand blue `#1E6FE8` as the single accent, Montserrat for display and Lato for reading, one italic emphasis word per heading, pill CTAs with a trailing arrow, 12px-radius form fields. The survey reuses these tokens exactly; DESIGN.md records the few places where its focus mode departs from the site on purpose. The site also relies on professional portraits and H-FARM campus photography, which the survey does not have. Voice: conversational yet authoritative, rhetorical and relatable, "no prepackaged answers", practical frameworks over promises; aspirational but grounded, no hype.

## Evidence on Hand
Only the public event site. Its fonts are Google Fonts (Montserrat, Lato) and its wordmark is set in type, so both are reproduced. No logo files, photos, testimonials or other brand assets have been supplied in the repo; do not fabricate them. Legal pages (Privacy, Cookie, Terms) exist on the event site; the consent gate links to its privacy page.

## Product Principles
1. Orient, never advise: every screen and the PDF stay on the right side of the advice line.
2. The survey exists to improve a human conversation; the PDF is the artifact that makes the 1:1 better.
3. Feel like the same house as the event site: continuity of look, voice, and trust.
4. Respect for sensitive data: ask only what the conversation needs, be explicit about why.
5. Serious but warm and plain Italian; clarity over jargon.

## Accessibility & Inclusion
Plain-language Italian for non-experts. Print legibility of the PDF matters. No further product-specific standard established; assume WCAG AA.
