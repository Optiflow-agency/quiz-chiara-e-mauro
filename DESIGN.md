---
name: La tua mappa finanziaria (Mauro & Chiara survey)
description: One question per screen, stepped through full-viewport navy and white grounds, built on the Guadagnare non basta+ event site's tokens.
colors:
  navy: "#0b2545"
  navy-deep: "#071a33"
  navy-lift: "#13335e"
  navy-glow: "#12386b"
  brand-blue: "#1e6fe8"
  brand-blue-dark: "#1558b8"
  blue-on-dark: "#6fa3ff"
  ice: "#eaf1fb"
  hairline: "#e1e6ed"
  hairline-hover: "#b9c6d8"
  mark-border: "#9fb0c6"
  muted: "#5b6b7f"
  muted-on-dark: "#a7bbd6"
  text-on-dark: "#dce6f5"
  error: "#c53030"
  error-on-dark: "#ffb3b3"
  paper: "#ffffff"
typography:
  display:
    fontFamily: "Montserrat, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(40px, 9.5vw, 84px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Montserrat, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(26px, 5.2vw, 42px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  amount:
    fontFamily: "Montserrat, Helvetica Neue, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 600
  wordmark:
    fontFamily: "Montserrat, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(17px, 2.4vw, 20px)"
    fontWeight: 400
    lineHeight: 1.6
  lead-compact:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(17px, 2.4vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  control:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  small:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  meta:
    fontFamily: "Lato, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  field: "12px"
  card: "16px"
  mark: "6px"
  pill: "999px"
spacing:
  gutter: "clamp(20px, 5vw, 40px)"
  option-gap: "10px"
  field-gap: "28px"
  node-top: "104px"
  node-bottom: "128px"
components:
  button-primary:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-primary-hover:
    backgroundColor: "{colors.brand-blue-dark}"
  option-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "14px 18px"
  option-row-selected:
    backgroundColor: "{colors.ice}"
  field-amount:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    typography: "{typography.amount}"
    rounded: "{rounded.field}"
  field-text:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  field-email-on-dark:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.navy}"
    rounded: "{rounded.field}"
    padding: "15px 16px"
  repeat-item:
    rounded: "{rounded.card}"
    padding: "20px"
  link-button:
    textColor: "{colors.brand-blue-dark}"
    typography: "{typography.control}"
  dock-button:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "44px"
---

# Design System: La tua mappa finanziaria

## Overview

**Creative North Star: "One Thing at a Time"**

The survey shows one thing per screen: a chapter title, a sheet's intro, then each of its questions alone, Typeform-style, with "Avanti" and a way back (client request, 2026-11-09; it replaced the earlier continuous vertical reel). Sheets stay an implementation detail: the respondent sees chapters and questions. Its tokens are the event site's (mauroechiaralive.com): the same navy grounds, crosshair grid and hero glow, brand blue as the single accent, Montserrat over Lato, pill buttons, 12px fields. It was built code-first with no comp and no raster assets; every surface is CSS, one inline SVG grid tile and five stroke icons. The mood is serious but warm: confident type, generous space, nothing that pushes the respondent forward.

Three screen tones alternate. Dark nodes (welcome, chapters, consent gate) are drenched navy with a faint crosshair grid and a lifted radial glow. Light nodes (sheet intros and questions) are plain white, the "focus mode": a calm ground where the only colour is the respondent's own selection. The end node is flat deep navy with no grid or glow, the same ground as the standalone pages (thank-you, profile), so the survey closes into them without a seam. The fixed top bar and the bottom-right dock swap their palette to match the screen in view.

Focus mode is a deliberate, minor departure from the event site, confirmed on 2026-10-01 after a side-by-side review. The site's ticket checkout sits on grey with white controls and a blue halo on the chosen row; the survey keeps white on white with an ice fill. The site puts a tracked uppercase label above its headings; the survey keeps section and position in the top bar. The site's CTA arrow sometimes sits in a round disc; the survey's never does.

**Key Characteristics:**
- Three grounds: grid-on-navy (dark), flat deep navy (end and standalone pages), white (sheets); no mid-tones, no cards on cards.
- One accent, brand blue, used for the CTA, selection, progress and focus; on dark it steps up to a lighter blue for text.
- Display type is Montserrat 600, tightly tracked, with one italic emphasis word in blue.
- Flat surfaces: depth comes from ground change, not shadow.
- Motion carries meaning: a signature entrance for each sheet intro and three fast question transitions chosen by what the step means (see Motion).

## Colors

A restrained navy-and-blue palette with one saturated accent and a cool ice tint for selection.

### Primary
- **Event Blue** (brand-blue): CTA fill, selected borders, check marks, progress fill, focus ring, dock buttons, text selection, the plus of the wordmark on white.
- **Pressed Blue** (brand-blue-dark): hover fill for buttons; also the emphasis word, link buttons and the help disclosure on light nodes (contrast-safe on white).
- **Lifted Blue** (blue-on-dark): emphasis word, links and the wordmark plus on navy; never used as a fill.

### Neutral
- **Event Navy** (navy): dark node base, dark chrome, theme-color, all text on white.
- **Deep Navy** (navy-deep): page background, flat end node and standalone pages, scrollbar track, gradient end.
- **Navy Glow** (navy-glow): the bright stop of the dark-node radial glow, taken from the event hero; used nowhere else.
- **Navy Lift** (navy-lift): declared from the event site, not used by any built component.
- **Ice** (ice): selected option fill.
- **Hairline** (hairline): 1.5px borders on options, fields and repeat items; progress track on light. **Hairline Hover** (hairline-hover) is its hover step on option rows.
- **Mark Border** (mark-border): the unselected check and radio outline.
- **Slate Muted** (muted): help, hints, status and chrome text on white.
- **Mist** (muted-on-dark) and **Pale Ice** (text-on-dark): secondary and body copy on navy.
- **Error Red** (error) / **Error Rose** (error-on-dark): invalid field and blocked save on white; the same on navy.

### Named Rules
**The One Blue Rule.** Blue marks action, selection and focus. It is never decorative fill on a node and never a second accent beside it.
**The Paired-Ground Rule.** Every text colour has a dark-ground and a light-ground twin (muted / muted-on-dark, error / error-on-dark, blue-dark / blue-on-dark). Pick by the node tone, never mix.

## Typography

**Display Font:** Montserrat (Helvetica Neue, Arial)
**Body Font:** Lato (Helvetica Neue, Arial)

**Character:** Montserrat carries voice and numerals; Lato carries reading. Both load from Google Fonts (Montserrat 500/600/700 plus 400 and 600 italic, Lato 400/700).

### Hierarchy
- **Display** (600, clamp(40px, 9.5vw, 84px), 1.05, -0.03em): titles on dark nodes and standalone pages.
- **Headline** (600, clamp(26px, 5.2vw, 42px), 1.15, -0.02em): sheet prompts on light nodes.
- **Amount** (Montserrat 600, 20px): typed figures, months and selects inside a field, so values read as the respondent's own. The placeholder drops to Lato 400 16px.
- **Wordmark** (Montserrat 600, 15px, -0.01em): the top-bar wordmark; its accent word is italic 400, as in the event site's logo.
- **Lead** (Lato 400, clamp(17px, 2.4vw, 20px), max 52ch): intro copy on section and end nodes. The gate and the standalone pages use the compact variant capped at 19px.
- **Body** (Lato 400, 17px, 1.6): base reading size; the "why" line under a sheet.
- **Label** (Lato 700, 16px): field labels on sheets and primary button text. The email label on the gate is the one exception at 14px.
- **Control** (Lato 700, 15px): link buttons; consent text and field units run 15px regular.
- **Small** (Lato 400 or 700, 14px): hints, warnings, errors (bold), privacy link (bold), repeat-item titles (bold, uppercase, 0.04em).
- **Meta** (Lato 400, 13px): top-bar label and save line; help-disclosure terms run 13px bold uppercase at 0.04em.

### Named Rules
**The One Italic Rule.** Each heading may italicise a single emphasis word, in blue, same weight. Italic is emphasis, never styling.

## Layout

One centred column, 720px max, inside a fluid gutter (20px to 40px, 5vw). Only one screen is in the DOM at rest (two while a transition runs, stacked in the same grid cell). Every screen is at least one small-viewport height tall, content centred vertically (safe), with 104px top and 128px bottom padding to clear the fixed bar and dock. A long option list scrolls the page; at 640px and below the Avanti/Salta row is sticky at the bottom (with "Indietro" on its left) and the dock is hidden on questions. Option lists stack in a single column at a 10px gap. Mobile-first: no multi-column layout exists.

The top bar is fixed with a 3px progress line on its lower edge. Its wordmark never wraps. The right side carries the chapter name (no position count: the number of questions changes with the answers), "Profilo". An "Esci" link back to the event site is built but commented out in `Survey.svelte` until it is needed (see the comment there for why it exists). At 640px and below the chapter name is hidden and the link collapses to an icon with a 44px hit area. The save line is fixed directly under the bar. The dock is fixed bottom-right with safe-area insets.

Standalone pages (thank-you, profile) are a single 640px column with 64px vertical padding on the deep-navy page ground, with no bar and no dock.

## Elevation & Depth

Flat by default. Depth is conveyed by the ground change between nodes and by the fixed chrome sitting on a solid ground matching the node. The only shadows are state or chrome: a soft ambient shadow under the dock (`0 12px 28px -14px rgba(7,26,51,.5)`) and a 3px focus halo on fields (`0 0 0 3px rgba(30,111,232,.15)` on light, `rgba(111,163,255,.35)` on dark).

### Named Rules
**The Flat-Until-Focused Rule.** Content surfaces carry no shadow at rest; only chrome and focused fields glow.

## Shapes

Soft but not bubbly. Fields and option rows are 12px; repeat-item groups (and the card in the emails) are 16px; check boxes are 6px squares, radios are circles; buttons and the dock are full pills. Borders are 1.5px hairlines that turn blue on selection. The signature geometry is the pill button with a trailing arrow icon and no disc.

## Components

### Buttons
- **Shape:** full pill (999px), 1px border matching fill.
- **Primary:** blue fill, white Lato 700 16px, padding 16px 28px, 12px gap to a trailing arrow icon; while busy the arrow gives way to an 18px spinner ring. A plain navigation link may drop the arrow.
- **Hover / Focus:** fill and border darken to pressed blue, disabled at 55% opacity; focus is a 2px blue outline at 3px offset.
- **Link button:** underlined Lato 700 15px in pressed blue with a 3px underline offset; used for "clear answers", add and remove. Disabled turns muted with no underline.

### Settings rows (profile page)
On the flat deep-navy standalone ground: Montserrat 600 22px section headings, then rows split by 1px pale-ice hairlines at 14% opacity. A row is the item on the left (Lato 700 title, 14px muted detail) and one action on the right; rows stack only under 360px. Actions are outline pills (Lato 700 15px, 10px 18px padding); destructive ones are outlined in error rose and open an inline 16px-radius confirmation panel with a filled Error Red button and an "Annulla" link. A granted consent shows a 14px check in lifted blue. The page keeps a single blue pill, its way back to the survey.

### Option rows
Whole-row labels with a hidden native input. 12px radius, 14px 18px padding, 14px gap to a 22px mark (square for multi, round for single) that fills blue with a white check when selected; the row turns ice with a blue border. Hover darkens the hairline. Focus shows on the row via `:has(input:focus-visible)`.

### Inputs / Fields
- **Style:** white, 1.5px hairline, 12px radius; a bold 16px label above, an optional 14px muted hint under it.
- **Amount, month, select:** one wrapper holding a Montserrat 20px control and, for amounts, a muted 15px unit. **Text:** 4-row textarea, vertical resize, with a hint below. **Email (gate, on dark):** white field on navy with native 22px checkboxes tinted blue.
- **Focus:** border turns blue plus the 3px halo. **Error:** border red (rose on dark) plus a bold 14px message announced as an alert.
- **Repeat item:** a 16px-radius hairline group with 20px padding holding one item's fields, a small uppercase title, and a remove link.

### Help disclosure
On each question: a native disclosure, "Perché te lo chiediamo", whose summary is bold pressed blue with a chevron that turns when open, holding the sheet's help in 15px muted text, capped at 52ch.

### Navigation
- **Top bar:** Montserrat wordmark with an italic 400 accent and a blue plus, on one line; chapter name in muted 13px, then "Profilo"; 3px progress line along the lower edge, filled by the questions passed.
- **Save line:** 13px muted status under the bar with a 14px check, a small spinner while saving, or an alert icon in the error colour when saving is blocked.
- **Dock:** pill with two 44px round blue buttons: up is back, down is next; disabled buttons fall to the track colour. Next breathes a soft ring once the question is answered.
- **Step model:** each screen is a browser history entry (shallow routing), so the phone's back gesture goes to the previous question. Single choice and amount bands advance on their own 300ms after a pick; multi choice and text wait for the button. No question is mandatory: unanswered, the button reads "Salta". Enter advances (Cmd/Ctrl+Enter in a text area). A returning respondent lands on the first unanswered question.
- All of them take the tone of the screen in view.

### Sheet intro and question screens
- **Sheet intro:** a large outline ordinal ("05", Montserrat 600, 1.5px #b9c6d8 stroke, decorative), the sheet prompt in Headline, its help in muted body, and an "Inizia" pill.
- **Question:** the sheet prompt as a small muted Montserrat 14px header, a "Perché te lo chiediamo" disclosure holding the sheet's help, the question itself as the headline (Montserrat 600, clamp(24px, 4.6vw, 36px)), the options, a "Cancella risposta" link once answered, and the Avanti/Salta pill.

### Frame
A full-viewport wrapper with tone `dark`, `light` or `flat`. The stage behind the screens takes the ground of the current tone, so nothing shows through a leaving screen.

## Motion

Transforms, opacity and clip-path only; ease `cubic-bezier(0.16, 1, 0.3, 1)` unless noted; exits faster than entrances; going back mirrors the forward move about 30% faster. The choice lives in `chooseTransition` (`src/lib/components/motion.ts`).

- **Sheet intro (signature, about 700ms):** the outline ordinal slides in, the prompt rises out of a clip mask line by line, then the help and the button follow. Moving to the first question, the prompt flies and shrinks into the question's small header (crossfade keyed by sheet).
- **Avanti (next question in the same sheet, about 350ms):** the old question leaves upward and fades; the new one rises 32px with its headline unmasked and the options staggered (at most 120ms in all).
- **Conseguenza (a question that exists because of the answer just given):** the new question grows out of the chosen option row, an ice window widening from the row's rectangle to the full screen over 560ms (ease in-out, so it reads as growth), while the old question dims behind it.
- **Cambio scheda/capitolo:** a horizontal wipe from the right over 500ms; the old screen slides 6% left and fades. Into a chapter or the gate the wipe carries the navy ground.
- **Reduced motion:** every move becomes a crossfade of 120ms or less; nothing travels.

### Emails
Code emails (confirmation, sign-in, email change) mirror the dark node in table markup: deep-navy page, navy card at 16px radius, Montserrat heading with the lifted-blue emphasis, Lato body, and the 6-digit code as large letter-spaced monospace plain text (no link, no button) so it can be selected in one tap.

## Do's and Don'ts

### Do:
- **Do** set sheets on white, the welcome, sections and gate on grid-on-navy, and the end node and standalone pages on flat deep navy; keep the tone choice per node type.
- **Do** keep blue as the single accent and use the on-dark or dark twin that fits the ground.
- **Do** keep targets 44px or larger in the dock and full-row option labels.
- **Do** keep every control reachable by keyboard with the 2px blue focus outline.
- **Do** use Montserrat 600 for headings and Lato for everything read.
- **Do** keep the wordmark on one line and the position label in the top bar.

### Don't:
- **Don't** make a question mandatory, add a numbered stepper, or show "n of N": the count changes with the answers; the thin progress line is the only measure.
- **Don't** pick a transition at random: each one says what kind of step it is.
- **Don't** add shadows to content surfaces or use hard offset shadows.
- **Don't** introduce a second accent colour or gradients beyond the dark-node glow.
- **Don't** use emoji or glyph characters as icons; icons are the inline stroke SVG set (arrow, up, down, check, alert, user, download).
- **Don't** put sheet nodes on a grey ground or add an uppercase label above headings to match the event site; focus mode keeps white on white by decision.

## Print Mode (the map PDF)

The per-respondent map is the one surface that is not on screen. It is drawn on the server with PDFKit (`src/lib/server/pdf/`), A4 portrait, four pages, printed at the event and handed out there (no self-service download). It is the survey on paper: page 1 opens on a dark node, pages 2 to 4 are white sheets, and the invitation closes on a flat deep-navy card.

- **Masthead (page 1):** a full-bleed navy band, 124pt tall, with the dark node's radial glow and crosshair grid (blue crosshairs only to the right of the title, clear of the text). It carries the top bar, the display title (28pt, white) and the lead in pale ice. It is kept short on purpose: it is the only large solid on a page that is printed some 300 times.
- **Top bar (every page):** the survey's chrome. The typed wordmark on the left (Montserrat 600, italic 400 accent, blue plus), date and "pagina n/4" on the right in muted 9pt, and the progress line underneath, filled in blue up to the page in hand. Dark palette on page 1, light on the others.
- **Titles:** Montserrat 600 at -0.02em with one italic emphasis word (The One Italic Rule), lifted blue on the masthead and pressed blue on white.
- **Colour:** dark ink `#141a26` for text, navy `#0b2545` for headings, rules and outlines, muted `#4b5b70` for secondary lines, hairline `#9fb0c6` (the last three are darker than on screen, for print). Blue keeps its roles: progress, the emphasis word, the wordmark plus, the bar beside the respondent's own question, the link on the closing card. Ice tints the lens pills.
- **Shapes:** lens tags are full pills (ice fill, navy outline); the six-area cells and the four number cells of page 1 are 8pt-radius hairline cells; an area block on pages 2-3 is a rule, the title, the lens tags of its sentences and one paragraph of running text; check boxes are small rounded squares; closing cards have a 12pt radius.
- **Closing cards (page 4):** the invitation is white text on flat deep navy, with the link in lifted blue and the QR code on a white rounded tile.
- **The black-and-white rule:** nothing is carried by colour alone. A clarity state is a word plus a shape (filled, half-filled, empty or dashed circle); a perspective is an outlined pill with its name; the emphasis word is also italic; the progress line sits beside the page number; the draft mark is a word. The page must read the same in greyscale.
- **Fonts:** Montserrat SemiBold and SemiBold Italic for titles and headings, Montserrat Italic for the wordmark accent, Lato Regular and Bold for text, all embedded from `src/lib/server/pdf/fonts/` (OFL licences alongside); no standard PDF font is loaded.
- **Type scale:** body 10.5pt, falling to 9pt when a page is tight; tags, top bar label and footer 9pt; page title 22pt, 28pt on the masthead.
- **Fit:** a page that overflows is tightened in steps: spacing first, then body size down to 9pt, then, on page 1 only, the respondent's own question. Approved sentences are never cut. The masthead and top bar never shrink.
- **Footer on every page:** the disclaimer line and the schede and rule versions. Drafts carry a large diagonal "BOZZA" at low opacity.
- **QR code:** drawn as vector squares, to the contact page (`https://mauroschileo.it/contatti/`); in the closing invitation.

Copy for the frame (titles, headings, legend, footer) is in `src/lib/content/map-layout.it.ts`; the sentences come composed in the document from `src/lib/content/map.it.ts`.
