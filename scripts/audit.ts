// Prints the audit of the survey and the map for colleagues and the client: every scheda, field,
// option and condition, the rules with their Italian texts, and the personas run through the real
// engine. Everything is read from the catalogue, the rules, the copy and the engine; the only
// hand-written parts are the short Italian prose and the formulas of the computed facts. The
// conditions of the rules come from docs/map-spec.md, and the script fails when a rule has none
// or when the computed facts documented here are not those of the engine.
// Run with: node scripts/audit.ts (needs Google Chrome; CHROME_PATH overrides its location).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { mapCopy } from '../src/lib/content/map.it.ts';
import { mapLayoutIt } from '../src/lib/content/map-layout.it.ts';
import { messages } from '../src/lib/content/messages.it.ts';
import { CATALOGUE_VERSION, catalogue } from '../src/lib/content/sheets.it.ts';
import { AREA_IDS, SIGNALS } from '../src/lib/map/clarity.ts';
import { buildMap, GATHER } from '../src/lib/map/compose.ts';
import { buildFacts } from '../src/lib/map/facts.ts';
import { PERSONAS } from '../src/lib/map/personas.ts';
import { RULES, RULES_VERSION, TOPICS } from '../src/lib/map/rules.ts';
import type { CatalogueField } from '../src/lib/survey/catalogue.ts';

const OUT = resolve('docs/audit-questionario-e-mappa.pdf');
const CHROME =
	process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONTS = resolve('src/lib/server/pdf/fonts');
const LENSES = mapLayoutIt.lenses;
const AREA_TITLE = mapCopy.areaTitles;

// ---------------------------------------------------------------------------------------------
// Lookups over the catalogue

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const code = (s: string) => `<code>${esc(s)}</code>`;
/** Spec text with `backticks` shown as code. */
const spec = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
/** A template with its `{slot}` placeholders marked. */
const tpl = (s: string) => esc(s).replace(/\{(\w+)\}/g, '<span class="slot">{$1}</span>');

const FIELDS = new Map<string, { sheet: string; field: CatalogueField }>();
for (const sheet of catalogue.sheets) {
	for (const field of sheet.fields) FIELDS.set(field.id, { sheet: sheet.id, field });
}

const ESCAPES: Record<string, string> = {
	unknown: messages.field.unknown,
	withheld: messages.field.withheld
};

type Option = { value: string; label: string; exclusive?: boolean; display_when?: string };

function optionsOf(field: CatalogueField): Option[] {
	if (field.type === 'single' || field.type === 'multi') return field.options;
	if (field.type === 'band') return catalogue.amountBandSets[field.band_set];
	return [];
}

function labelOf(fieldId: string, value: string): string {
	const { field } = FIELDS.get(fieldId)!;
	if (ESCAPES[value]) return ESCAPES[value];
	const option = optionsOf(field).find((o) => o.value === value);
	if (!option) throw new Error(`Field ${fieldId} has no value "${value}"`);
	return option.label;
}

/** The reserved answers a field offers: bands always both. */
const escapesOf = (field: CatalogueField): string[] =>
	field.type === 'band'
		? ['unknown', 'withheld']
		: field.type === 'textarea'
			? []
			: (field.escapes ?? []);

const val = (field: string, v: string) => `<q>${esc(labelOf(field, v))}</q>`;
const orList = (items: string[]) =>
	items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} o ${items.at(-1)}`;

/** A `display_when` expression in Italian, with the labels of the answers it names. */
function describeCondition(source: string): string {
	return source
		.split(/\s+OR\s+/)
		.map((alt) =>
			alt
				.split(/\s+AND\s+/)
				.map((clause) => {
					const m = /^(\w+)\.(\w+)\s*(?:(==|!=|in|includes)\s+(.+)|(missing))$/.exec(clause.trim());
					if (!m) throw new Error(`Unparseable condition ${clause}`);
					const [, sheet, field, op, raw = '', missing] = m;
					const ref = code(`${sheet}.${field}`);
					if (missing) return `${ref} non ha risposta`;
					const values = raw
						.replace(/[[\]]/g, '')
						.split(',')
						.map((v) => val(field, v.trim()));
					if (op === '==') return `${ref} = ${values[0]}`;
					if (op === '!=') return `${ref} ha una risposta diversa da ${values[0]}`;
					if (op === 'in') return `${ref} è ${orList(values)}`;
					return `tra le risposte di ${ref} c’è almeno una tra ${orList(values)}`;
				})
				.join(' e ')
		)
		.join(' oppure ');
}

// ---------------------------------------------------------------------------------------------
// Schede

const TYPE_LABEL = {
	single: 'scelta singola',
	multi: 'scelta multipla',
	band: 'fascia di importo',
	textarea: 'testo libero'
};

function fieldBlock(sheetId: string, field: CatalogueField): string {
	const escapes = escapesOf(field);
	const extra = [
		field.type === 'multi' && field.max_choices ? `al massimo ${field.max_choices} scelte` : '',
		field.type === 'band' ? `fasce ${code(field.band_set)}` : '',
		field.type === 'textarea' ? `al massimo ${field.max_length} caratteri` : ''
	].filter(Boolean);
	const options = optionsOf(field);
	const rows = [
		...options.map(
			(o) =>
				`<tr><td class="v">${code(o.value)}</td><td>${esc(o.label)}${
					o.exclusive ? ' <span class="tag">esclusiva</span>' : ''
				}${o.display_when ? ` <span class="tag">solo se ${describeCondition(o.display_when)}</span>` : ''}</td></tr>`
		),
		...escapes.map(
			(e) => `<tr class="escape"><td class="v">${code(e)}</td><td>${esc(ESCAPES[e])}</td></tr>`
		)
	];
	return `
	<div class="field">
		<div class="field-head"><span class="fid">${sheetId}.${field.id}</span>
			<span class="ftype">${TYPE_LABEL[field.type]}${extra.length ? ' · ' + extra.join(' · ') : ''}</span></div>
		<p class="flabel">${esc(field.label)}</p>
		${field.note ? `<p class="fnote">${esc(field.note)}</p>` : ''}
		${field.display_when !== 'always' ? `<p class="cond"><b>Compare solo se</b> ${describeCondition(field.display_when)}.</p>` : ''}
		${rows.length ? `<table class="opts"><tbody>${rows.join('')}</tbody></table>` : ''}
	</div>`;
}

let section = '';
const schedeHtml = catalogue.sheets
	.map((sheet) => {
		const head = sheet.section !== section ? `<h3 class="section">${esc(sheet.section)}</h3>` : '';
		section = sheet.section;
		return `${head}
	<section class="sheet">
		<h4><span class="sid">${sheet.id}</span> ${esc(sheet.prompt)}</h4>
		<p class="help">${esc(sheet.help)}${
			sheet.display_when !== 'always'
				? ` <b>Scheda opzionale</b>: compare solo se ${describeCondition(sheet.display_when)}.`
				: ''
		}</p>
		${sheet.fields.map((f) => fieldBlock(sheet.id, f)).join('')}
	</section>`;
	})
	.join('');

const bandsHtml = Object.entries(catalogue.amountBandSets)
	.map(([name, bands]) => {
		const users = [...FIELDS.values()]
			.filter((e) => e.field.type === 'band' && e.field.band_set === name)
			.map((e) => code(`${e.sheet}.${e.field.id}`));
		return `<tr><td>${code(name)}<br><span class="muted small">${users.join(', ')}</span></td><td>${bands
			.map((b) => `${esc(b.label)}`)
			.join(' · ')}</td></tr>`;
	})
	.join('');

// ---------------------------------------------------------------------------------------------
// Computed facts: formulas of docs/map-spec.md section 4 (the only hand-written part)

const COMPUTED: Record<string, [formula: string, meaning: string]> = {
	outgoings: ['E + R', 'spese fisse e rate insieme, al mese'],
	margin: ['I − (E + R) = [I.lo − O.hi, I.hi − O.lo]', 'quanto resta, o manca, a fine mese'],
	marginYear: ['margin × 12', 'il margine mensile su un anno'],
	coverMonths: ['A / (E + R) mesi', 'per quanti mesi la liquidità copre spese e rate'],
	shockAmount: [
		'10.000 se I.lo ≥ 10.000, 5.000 se I.lo ≥ 2.500, altrimenti 2.000 (anche con I non nota)',
		'la spesa imprevista di riferimento (la domanda non indica un importo)'
	],
	shockWeeks: ['shockAmount / I × 52 / 12 settimane', 'quella spesa, in settimane di entrate'],
	shockShare: ['shockAmount / A, in percentuale', 'la stessa spesa, come quota della liquidità'],
	instalmentsYear: ['R × 12', 'le rate in un anno'],
	instalmentShare: ['R / I, in percentuale', 'il peso delle rate sulle entrate'],
	threeMonths: ['(E + R) × 3', 'tre mesi di spese fisse e rate'],
	missingThree: ['3(E + R) − A', 'quanto di quei tre mesi la liquidità non copre'],
	savingYear: ['S × 12', 'il risparmio mensile su un anno'],
	savingShare: ['S / I, in percentuale', 'il risparmio mensile in rapporto alle entrate'],
	pacShare: [
		'P / S, in percentuale',
		'la parte del risparmio mensile che va nei piani di accumulo'
	],
	pacYear: ['P × 12', 'i versamenti nei piani di accumulo in un anno'],
	children: ['no 0 · one 1 · two 2 · three_plus 3', 'numero di figli'],
	dependentChildren: [
		'children_independent è some o none',
		'qualche figlio dipende ancora da chi risponde'
	],
	debtCount: ['debt_types diversi da none', 'quanti impegni a rate'],
	holdingsCount: [
		'holdings diversi da none, property, business_stakes, other',
		'in quante forme finanziarie sono i risparmi'
	],
	pensionKnown: [
		'elementi della pensione noti (tfr, pension_fund, pension_sim)',
		'quanti sono noti'
	],
	pensionTotal: ['3 per i dipendenti, altrimenti 2', 'quanti si possono conoscere']
};

// The documented facts are exactly the computed ones of the engine (those that are not answers).
{
	const sample = buildFacts({}, catalogue.amountBandSets) as unknown as Record<string, unknown>;
	const computed = Object.keys(sample).filter(
		(k) => !(sample[k] && typeof sample[k] === 'object' && 'status' in (sample[k] as object))
	);
	const diff = [
		...computed.filter((k) => !COMPUTED[k]),
		...Object.keys(COMPUTED).filter((k) => !computed.includes(k))
	];
	if (diff.length) throw new Error(`Computed facts drifted from the engine: ${diff.join(', ')}`);
}

const factRows = Object.entries(COMPUTED)
	.map(
		([id, [formula, meaning]]) =>
			`<tr><td>${code(id)}</td><td>${esc(formula)}</td><td>${esc(meaning)}</td></tr>`
	)
	.join('');

// ---------------------------------------------------------------------------------------------
// Area clarity: the signals, probed through the engine so the table cannot drift from it

// The signals are named after facts; only the income differs from its field.
const SIGNAL_FIELD: Record<string, string> = { income: 'income_self' };
const signalRows = SIGNALS.map((s) => {
	const fieldId = SIGNAL_FIELD[s.id] ?? s.id;
	const { sheet, field } = FIELDS.get(fieldId)!;
	const values = [
		...(field.type === 'band'
			? [catalogue.amountBandSets[field.band_set][0]]
			: optionsOf(field)
		).map((o) => o.value),
		...escapesOf(field)
	];
	const unclear = values.filter((v) => {
		const answers = {
			// Instalments are only asked when there are debts.
			...(sheet === 'S08' ? { S08: { debt_types: ['car'] } } : {}),
			[sheet]: {
				...(sheet === 'S08' ? { debt_types: ['car'] } : {}),
				[fieldId]: field.type === 'multi' ? [v] : v
			}
		};
		return s.read(buildFacts(answers, catalogue.amountBandSets)) === 'unclear';
	});
	const named = unclear.map((v) =>
		field.type === 'band' && v !== 'unknown' ? '' : labelOf(fieldId, v)
	);
	return `<tr><td>${s.area}</td><td>${code(`${sheet}.${fieldId}`)} ${esc(field.label)}</td><td>${
		named
			.filter(Boolean)
			.map((n) => `<q>${esc(n)}</q>`)
			.join(', ') || 'mai'
	}</td></tr>`;
}).join('');

// ---------------------------------------------------------------------------------------------
// Rules: logic from the code, conditions from the spec, texts from the copy

const specText = readFileSync(resolve('docs/map-spec.md'), 'utf8');
const CONDITIONS = new Map<string, string>();
for (const m of specText.matchAll(
	/^\*\*([A-Z]{2}-\d{2})\*\* · (?:tier \d(?: \([^)]*\))?|F) · \w+(?: · (.*))?$/gm
)) {
	CONDITIONS.set(m[1], m[2] ?? '');
}
const undocumented = RULES.filter((r) => !CONDITIONS.has(r.id)).map((r) => r.id);
if (undocumented.length) throw new Error(`No condition in the spec for ${undocumented.join(', ')}`);

const TIERS: Record<string, string> = {
	'1': 'spese e rate sopra le entrate',
	'2': 'persone e protezione',
	'3': 'obiettivi contro abitudini, tempi o risorse',
	'4': 'ciò che un dato mancante impedisce di calcolare',
	'5': 'altre letture',
	'6': 'punto fermo, mai in evidenza',
	F: 'fatto calcolato, mai in evidenza'
};

function ruleBlock(ruleId: string): string {
	const rule = RULES.find((r) => r.id === ruleId)!;
	const copy = mapCopy.rules[rule.id];
	const text =
		typeof copy.text === 'string'
			? `<p class="tpl">${tpl(copy.text)}</p>`
			: Object.entries(copy.text)
					.map(
						([variant, t], i) =>
							`<p class="tpl"><span class="vn">${i + 1}. ${code(variant)}</span> ${tpl(t)}</p>`
					)
					.join('');
	const condition = CONDITIONS.get(rule.id);
	return `
	<section class="rule">
		<div class="rule-head">
			<span class="rid">${rule.id}</span>
			<span class="badge">${rule.tier === 'F' ? 'F' : 'livello ' + rule.tier} · ${TIERS[String(rule.tier)]}</span>
			<span class="badge">${LENSES[rule.lens]}</span>
			<span class="badge ${rule.approved ? 'ok' : 'todo'}">${rule.approved ? 'approvata' : 'da approvare'}</span>
		</div>
		<p class="small"><b>Scatta quando</b> ${condition?.startsWith('needs ') ? `${spec(condition.slice(6))} è calcolabile` : condition ? spec(condition) : 'sempre'} <span class="muted">· legge ${rule.reads.map((f) => code(f)).join(', ')}</span></p>
		${text}
		<p class="small"><b>Domanda da portare:</b> ${copy.question ? `«${esc(copy.question)}»` : '<i>nessuna</i>'}</p>
		<p class="small"><b>Da non far intendere</b> (nota per chi rivede, mai stampata): ${copy.never ? esc(copy.never) : '<i>nessuna nota</i>'}</p>
	</section>`;
}

const rulesHtml = AREA_IDS.map(
	(area) =>
		`<h3>${area} · ${esc(AREA_TITLE[area])}</h3>${RULES.filter((r) => r.area === area)
			.map((r) => ruleBlock(r.id))
			.join('')}`
).join('');

/** What the answers must show for an item to be listed (spec section 8), by item id. */
const GATHER_ONLY_WHEN: Record<string, string> = {
	products: 'ci sono investimenti, un prodotto finanziario o un piano di accumulo',
	policies: 'c’è una copertura (o non si sa se ci sia), oppure un mutuo',
	assets: 'la persona possiede almeno una cosa: casa, altri immobili, investimenti o un’attività'
};

const gatherRows = GATHER.map(
	([id, ids]) =>
		`<tr><td>${esc(mapCopy.gather[id])}</td><td>${ids.join(', ')}</td><td>${esc(GATHER_ONLY_WHEN[id] ?? '')}</td></tr>`
).join('');
if (GATHER.some(([id, , exists]) => Boolean(exists) !== id in GATHER_ONLY_WHEN)) {
	throw new Error('GATHER_ONLY_WHEN does not match the items GATHER filters on');
}

// ---------------------------------------------------------------------------------------------
// Personas, through the real engine in draft mode (all rules, approved or not)

function personaBlock(p: (typeof PERSONAS)[number]): string {
	const doc = buildMap(p.answers, {
		bands: catalogue.amountBandSets,
		rules: RULES,
		topics: TOPICS,
		copy: mapCopy,
		now: new Date(),
		draft: true,
		catalogue: CATALOGUE_VERSION
	});
	const answers = Object.entries(p.answers)
		.map(
			([sheet, values]) =>
				`<b>${sheet}</b> ${Object.entries(values)
					.map(([k, v]) => {
						const shown = [v]
							.flat()
							.map((x) => (FIELDS.get(k)!.field.type === 'textarea' ? x : labelOf(k, x)));
						return `${k}: ${esc(shown.join(', '))}`;
					})
					.join(' · ')}`
		)
		.join('<br>');
	const highlights = doc.highlights.map((h) => h.ruleId);
	const matches = highlights.join() === p.expected.highlights.join();
	return `
	<section class="persona">
		<h4>${esc(p.name)}</h4>
		<p class="help">${esc(p.summary)}</p>
		<p class="answers">${answers}</p>
		<table class="kv"><tbody>
			<tr><td>${esc(mapLayoutIt.sections.start)}</td><td>${esc(doc.snapshot.context)}</td></tr>
			<tr><td>${esc(mapLayoutIt.sections.numbers)}</td><td>${doc.snapshot.numbers
				.map(
					(n) =>
						`${esc(n.label)}: ${n.value ? esc(`${n.value.lead} ${n.value.figure}`.trim()) : esc(mapLayoutIt.fallback.notComputable)}`
				)
				.join(' · ')}</td></tr>
			<tr><td>${esc(mapLayoutIt.sections.highlights)}</td><td>${highlights.join(', ') || 'nessuno'} ${
				matches
					? ''
					: `<span class="tag warn">la specifica prevede ${p.expected.highlights.join(', ') || 'nessuno'}</span>`
			}</td></tr>
		</tbody></table>
		${doc.areas
			.map(
				(
					a
				) => `<div class="parea"><p><b>${esc(a.title)}</b> · ${esc(a.notApplicable ?? mapLayoutIt.clarity[a.clarity])}</p>
				${a.sentences.map((s) => `<p class="sent"><span class="rid-s">${s.ruleId}</span> ${esc(s.text)}</p>`).join('')}
				${a.note ? `<p class="sent muted">${esc(a.note)}</p>` : ''}</div>`
			)
			.join('')}
	</section>`;
}

// ---------------------------------------------------------------------------------------------
// Document

const L = mapLayoutIt;
const title = (p: { before: string; accent: string; after: string }) =>
	p.before + p.accent + p.after;
const optional = [...FIELDS.values()].filter((e) => e.field.display_when !== 'always').length;
const today = new Date().toLocaleDateString('it-IT', {
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

const SECTIONS: [id: string, title: string, body: string][] = [
	[
		'scopo',
		'A cosa serve questo documento',
		`<p>È la fotografia esatta di ciò che il questionario e la mappa fanno oggi. Non è scritto a mano: viene generato dal codice (schede, regole, testi e motore), quindi quello che si legge è quello che le persone vedono e ricevono. Ogni elemento ha un identificativo stabile (<code>S05.fixed</code> per una domanda, <code>IO-02</code> per una regola): usatelo nelle proposte di modifica.</p>
		<div class="box alert"><b>Regola che non si discute:</b> la mappa descrive e orienta, non consiglia mai. Niente raccomandazioni, prodotti, proiezioni o frasi del tipo “dovresti”. Solo i consulenti, uno a uno con la persona, possono dare consigli. Una proposta che porti un testo verso il consiglio è un difetto, non una modifica.</div>`
	],
	[
		'scelte',
		'Le scelte fatte sul questionario approvato',
		`<p>Dove il questionario approvato non bastava a costruire le schede o la mappa, abbiamo deciso così. Chiediamo a Mauro e Chiara di confermare.</p>
		<ul>
			<li>Le condizioni di comparsa non erano indicate nel questionario: le abbiamo impostate come mostrano le schede qui sotto (domande Q4, Q8-Q10, Q11, Q17, Q19, Q23-Q26, Q29-Q32, Q35b e alcune singole risposte).</li>
			<li>Q11 (entrate) ha due formulazioni, scelte in base alla risposta a Q2: “le tue entrate nette” (single, separato, divorziato, vedovo) o “le entrate nette della tua famiglia” (sposato, convivente, o Q2 senza risposta), perché Q12 chiede le spese della famiglia e la mappa confronta le due cifre.</li>
			<li>Modifiche del 12 novembre, chieste dal cliente: Q2 divide “Sposato/a o convivente” e “Separato/a o divorziato/a” in quattro risposte (nella mappa sposati e conviventi restano “Una coppia”); Q24 accetta più risposte; sette schede hanno un titolo nuovo (S04, S05, S07, S09, S14, S16, S17). IO-04 e SA-07 seguono le nuove risposte con lo stesso testo e restano approvate.</li>
			<li>Le fasce di Q12 si sovrapponevano (800-1.500 e 1.200-1.600) e saltavano 2.500-5.000: ora sono meno di 800 · 800-1.500 · 1.500-2.500 · 2.500-5.000 · più di 5.000.</li>
			<li>Q14: “Non lo so preferisco non dirlo” è diviso nelle due risposte standard, “Non lo so” e “Preferisco non dirlo”. Q17, Q19 e Q23 offrono anch’esse “Non lo so” (ogni domanda di importo offre entrambe).</li>
			<li>Q23: le fasce sono scritte 100-250 · 250-500 · 500-1.000, come le altre.</li>
			<li>Q31: tolta “Non ho figli” (la domanda compare solo a chi ha figli); risposte riformulate perché si leggano allo stesso modo; aggiunta “Non lo so” per chi non ha controllato.</li>
			<li>Q35b: “Penso sia un argomento da affrontare in futuro” non è offerta a chi ha scelto “Penso sia un tema da affrontare più avanti” in Q35 (stessa risposta due volte).</li>
			<li>Q36: nessun limite al numero di obiettivi (la seconda versione ne ammetteva tre).</li>
			<li>Q21 torna a chiedere di immobili e fondi pensione già chiesti in Q5 e Q29: lasciata com’è, perché approvata.</li>
		</ul>
		<p>Per la mappa restano da decidere o verificare: la spesa imprevista di riferimento di RI-02 (importo scelto per fascia di entrate, perché Q15 non ne indica uno); la revisione legale delle frasi generali su TFR, contributi, fondi pensione, prestiti e successione (PE-04, PE-05, PE-07, DE-12, PR-12); le frasi che esprimono un’inferenza più che un calcolo (IO-02, IO-03, RI-04); la moderazione dei due testi liberi, che arrivano ai consulenti senza una lettura intermedia; l’uso del “voi” anche per chi vive da solo; il fatto che le fasce di liquidità partano da “Meno di 10.000 €”, per cui la riserva in mesi risulta spesso ampia; infine la revisione di tutti i testi e la revisione legale delle pagine 1 e 4.</p>`
	],
	[
		'percorso',
		'Come si legge la mappa',
		`<p>Le cifre si chiedono per fasce (“Tra 1.500 e 2.500 €”). Il motore non inventa mai un numero preciso: ogni calcolo lavora su intervalli e il risultato è sempre “tra X e Y”, “fino a Y” o “almeno X”. Se un dato non c’è (“Non lo so”, “Preferisco non dirlo”, nessuna risposta), la frase che ne avrebbe bisogno non viene stampata; al suo posto, quando serve, una frase dice che cosa quel dato mancante impedisce di calcolare.</p>
		<p>Ogni frase deve fare almeno una di tre cose: dire un fatto calcolato; unire due o più risposte in una conseguenza che la persona non ha tratto; dire che cosa un dato mancante impedisce di calcolare. Nessuna frase si limita a ripetere una risposta.</p>
		<p>Il PDF ha quattro pagine A4 e porta in fondo: «${esc(L.footer.disclaimer)}».</p>
		<ul>
			<li><b>Pagina 1, ${esc(title(L.pages.summary))}</b>: ${[L.sections.start, L.sections.numbers, L.sections.areas, L.sections.highlights, L.sections.goals, L.sections.forReader, L.sections.legend].map(esc).join(' · ')}. I quattro numeri sono: ${mapCopy.numbers.labels.map(esc).join(', ')}.</li>
			<li><b>Pagine 2 e 3, ${esc(title(L.pages.areas))}</b>: un paragrafo per area (IO, RI, DE nella pagina 2; SA, PR, PE nella 3), con lo stato dell’area, le prospettive delle frasi e i collegamenti con le altre parti.</li>
			<li><b>Pagina 4, ${esc(title(L.pages.next))}</b>: ${esc(L.sections.questions)}, ${esc(L.sections.gather)} e l’invito a leggere la mappa con un consulente, con il codice QR della pagina contatti.</li>
		</ul>
		<h3>Prospettive e livelli</h3>
		<p>Ogni frase ha una prospettiva (${Object.entries(L.lensLegend)
			.map(([k, v]) => `<b>${LENSES[k as keyof typeof LENSES]}</b>: ${esc(v)}`)
			.join('; ')}) e un livello: ${Object.entries(TIERS)
			.map(([k, v]) => `<b>${k}</b> ${esc(v)}`)
			.join('; ')}.</p>
		<p>Ogni area stampa prima le frasi F (fatti calcolati), poi al massimo tre frasi di livello 1-5, in ordine di livello. Le frasi di livello 1-5 possono diventare “punti da approfondire” (al massimo tre): prima le frasi forti (livelli 1-3), poi le altre (4-5), mai una debole finché ne resta una forte; in ciascun gruppo si prende prima una frase per area, in ordine di livello, poi si completa con le restanti. Se le frasi che scattano sono meno di tre, i punti sono meno di tre.</p>
		<p>Alcune frasi dicono la stessa cosa con parole diverse: di ciascun gruppo si stampa solo la prima che scatta, nell’ordine indicato (${TOPICS.map((t) => t.join(', ')).join('; ')}).</p>`
	],
	[
		'schede',
		'Le schede, domanda per domanda',
		`<p>${catalogue.sheets.length} schede e ${FIELDS.size} domande, di cui ${optional} opzionali. Una domanda, una scheda o una singola risposta opzionale compare solo quando la sua condizione è vera; le condizioni guardano solo risposte già date, quindi una domanda opzionale non compare mai “per difetto”. “Non lo so” e “Preferisco non dirlo” non soddisfano nessuna condizione.</p>
		<p>Le schede servono a organizzare il lavoro: chi compila vede una domanda per schermata, preceduta da una breve introduzione della scheda (il suo testo e l’aiuto), e può tornare indietro o saltare una domanda.</p>${schedeHtml}`
	],
	[
		'fasce',
		'Le fasce di importo',
		`<p>Ogni fascia diventa un intervallo [da, a] nei calcoli; “Più di” e “Oltre” vogliono dire senza limite superiore.</p><table class="grid"><tbody>${bandsHtml}</tbody></table>`
	],
	[
		'fatti',
		'I fatti calcolati',
		`<p>Lettere usate: I entrate (<code>income_self</code> o <code>income_household</code>), E spese fisse, R rate, A liquidità, S risparmio mensile, P versamenti nei piani di accumulo, O = E + R. Ogni valore è un intervallo (.lo e .hi sono i suoi estremi). Un fatto <b>non è calcolabile</b> quando un dato è “Non lo so”, “Preferisco non dirlo” o manca, oppure quando il risultato è aperto da entrambi i lati. R vale 0 se non ci sono debiti.</p>
		<table class="grid"><thead><tr><th>Fatto</th><th>Formula</th><th>Significato</th></tr></thead><tbody>${factRows}</tbody></table>`
	],
	[
		'chiarezza',
		'Lo stato di ogni area',
		`<p>Ogni area riceve uno stato che dice <b>quanto è completo il quadro</b>, mai se la situazione è buona o cattiva. Lo stato nasce da alcuni segnali, ciascuno chiaro, non chiaro o assente (“Preferisco non dirlo”, nessuna risposta, non pertinente). “${esc(L.clarity.chiara)}”: nessun segnale non chiaro. “${esc(L.clarity.da_ricostruire)}”: almeno metà dei segnali presenti è non chiara. “${esc(L.clarity.in_parte)}”: tutti gli altri casi. “${esc(L.clarity.non_compilata)}”: nessuna domanda dell’area ha una risposta; un’area così non stampa nessuna frase. Con risposte ma tutti i segnali assenti lo stato è “${esc(L.clarity.in_parte)}”. Per chi è in pensione l’area PE stampa «${esc(mapCopy.retired)}». Se un segnale dell’area è “Preferisco non dirlo”, il paragrafo si chiude con «${esc(mapCopy.withheldLine)}».</p>
		<table class="grid"><thead><tr><th>Area</th><th>Segnale</th><th>Non chiaro quando</th></tr></thead><tbody>${signalRows}</tbody></table>`
	],
	[
		'regole',
		`Le ${RULES.length} regole di lettura`,
		`<p>${RULES.filter((r) => r.approved).length} regole su ${RULES.length} sono approvate; le altre compaiono solo nelle mappe di prova (“${esc(L.draftMark)}”). Una regola scatta solo se tutti i dati che legge sono noti, salvo quando la sua condizione nomina “Non lo so”. Se ha più varianti, vale la prima la cui condizione è vera. Le parti in <span class="slot">{blu}</span> sono riempite dai valori calcolati; se un valore non è stampabile, la frase non viene stampata. Le condizioni sono quelle della specifica; i testi, le domande e le note sono quelli del codice.</p>${rulesHtml}`
	],
	[
		'gather',
		L.sections.gather,
		`<p>Un elemento compare a pagina 4 se almeno una delle regole indicate è stampata in qualsiasi punto della mappa e, dove indicato, se le risposte dicono che la cosa esiste: una regola da sola non dice che c’è un rendiconto o una polizza da portare.</p><table class="grid"><thead><tr><th>Elemento</th><th>Regole</th><th>Solo se</th></tr></thead><tbody>${gatherRows}</tbody></table>`
	],
	[
		'persone',
		`${PERSONAS.length} persone di prova, passate nel motore`,
		`<p>Persone inventate, descritte nella specifica. Le loro risposte sono passate nel motore vero, in modalità bozza (anche le regole non approvate). Quello che segue è ciò che la mappa stamperebbe. Se i punti da approfondire non coincidono con quelli attesi dalla specifica, è segnalato.</p>${PERSONAS.map(personaBlock).join('')}`
	]
];

const html = `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<title>Il questionario e la mappa</title>
<style>
@font-face { font-family: Lato; src: url("file://${FONTS}/Lato-Regular.ttf"); font-weight: 400; }
@font-face { font-family: Lato; src: url("file://${FONTS}/Lato-Bold.ttf"); font-weight: 700; }
@font-face { font-family: Montserrat; src: url("file://${FONTS}/Montserrat-SemiBold.ttf"); font-weight: 600; }
@font-face { font-family: Montserrat; src: url("file://${FONTS}/Montserrat-Light.ttf"); font-weight: 300; }
@page { size: A4; margin: 18mm 17mm; }
:root { --navy: #0b2545; --blue: #1e6fe8; --ink: #1d2733; --muted: #5d6b7a; --line: #d8dee8; --soft: #f2f5fa; --warn: #a4471b; }
* { box-sizing: border-box; }
body { font-family: Lato, sans-serif; font-size: 9.6pt; line-height: 1.45; color: var(--ink); margin: 0; }
h1, h2, h3, h4 { font-family: Montserrat, sans-serif; font-weight: 600; color: var(--navy); line-height: 1.2; }
h1 { font-size: 26pt; font-weight: 300; margin: 0 0 6mm; }
h2 { font-size: 15pt; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 1.5pt solid var(--navy); break-before: page; }
h3 { font-size: 11pt; margin: 6mm 0 2mm; break-after: avoid; }
h4 { font-size: 10pt; margin: 4mm 0 1.5mm; break-after: avoid; }
h3.section { font-size: 12.5pt; border-top: 1.5pt solid var(--navy); padding-top: 3mm; margin-top: 8mm; }
p { margin: 0 0 2mm; }
code { font-family: Menlo, monospace; font-size: 8pt; background: var(--soft); padding: 0 2px; border-radius: 2px; color: var(--navy); }
q { quotes: "«" "»"; color: var(--muted); }
a { color: inherit; text-decoration: none; }
table { border-collapse: collapse; width: 100%; margin: 1mm 0 3mm; }
td, th { vertical-align: top; text-align: left; padding: 1.2mm 2mm; }
table.grid td, table.grid th { border-bottom: 0.5pt solid var(--line); }
table.grid th { font-family: Montserrat; font-size: 8pt; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.small { font-size: 8.8pt; }
.muted { color: var(--muted); }
.warn { color: var(--warn); }
.tag { display: inline-block; font-size: 7pt; border: 0.5pt solid var(--line); border-radius: 6px; padding: 0 4px; color: var(--muted); }
.tag.warn { color: var(--warn); border-color: #e2b79f; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: space-between; }
.cover .kicker { font-family: Montserrat; font-size: 9pt; letter-spacing: .14em; text-transform: uppercase; color: var(--blue); margin-bottom: 4mm; }
.cover .lead { font-size: 12pt; max-width: 145mm; }
.cover table td { padding: 1mm 4mm 1mm 0; border-bottom: 0.5pt solid var(--line); }
.box { background: var(--soft); border-left: 2pt solid var(--navy); padding: 3mm 4mm; margin: 3mm 0; break-inside: avoid; }
.box.alert { border-left-color: var(--warn); }
.toc a { display: block; padding: 1mm 0; border-bottom: 0.5pt solid var(--line); }
.sid, .rid { font-family: Montserrat; font-weight: 600; color: var(--blue); }
.help { font-size: 8.8pt; color: var(--muted); }
.field { border-left: 1pt solid var(--line); padding: 1mm 0 0.5mm 3.5mm; margin: 2.5mm 0 3mm; break-inside: avoid; }
.field-head { display: flex; justify-content: space-between; gap: 4mm; font-size: 8pt; }
.fid { font-family: Menlo, monospace; color: var(--navy); font-weight: 700; }
.ftype { color: var(--muted); text-align: right; }
.flabel { font-weight: 700; margin: 0.8mm 0 1mm; }
.fnote { font-size: 8.6pt; color: var(--muted); }
.cond { font-size: 8.8pt; background: #fff6ec; padding: 1mm 2mm; border-radius: 2px; }
table.opts { width: auto; margin: 0 0 1mm; font-size: 8.8pt; }
table.opts td { padding: 0.3mm 3mm 0.3mm 0; }
table.opts td.v { width: 38mm; }
table.opts tr.escape td { color: var(--muted); }
.rule { border-top: 0.5pt solid var(--line); padding-top: 2.5mm; margin-top: 3mm; break-inside: avoid; }
.rule-head { display: flex; flex-wrap: wrap; align-items: center; gap: 2mm; margin-bottom: 1.5mm; }
.rule-head .rid { font-size: 11pt; margin-right: 1mm; }
.badge { font-size: 7.6pt; border: 0.5pt solid var(--line); border-radius: 8px; padding: 0.3mm 2mm; color: var(--muted); }
.badge.todo { color: var(--warn); border-color: #e2b79f; }
.badge.ok { color: #22663a; border-color: #9cc7a8; }
.tpl { border-left: 2pt solid var(--blue); padding: 0.5mm 0 0.5mm 3mm; margin: 1mm 0 2mm; }
.tpl .vn { font-size: 8pt; margin-right: 2mm; }
.slot { font-family: Menlo, monospace; font-size: 8pt; color: var(--blue); }
.persona { border-top: 0.5pt solid var(--line); margin-top: 4mm; }
.answers { font-family: Menlo, monospace; font-size: 7.4pt; color: var(--muted); line-height: 1.5; }
table.kv td:first-child { width: 42mm; font-weight: 700; color: var(--navy); }
table.kv td { border-bottom: 0.5pt solid var(--line); font-size: 8.8pt; }
.parea { break-inside: avoid; margin: 2mm 0; }
.parea p { margin: 0 0 1mm; }
.sent { font-size: 8.8pt; padding-left: 3mm; }
.rid-s { font-family: Menlo, monospace; font-size: 7.4pt; color: var(--blue); }
ol li, ul li { margin-bottom: 1.2mm; }
</style></head><body>

<section class="cover">
	<div>
		<p class="kicker">Documento di lavoro</p>
		<h1>Il questionario e la mappa finanziaria</h1>
		<p class="lead">Le schede con le domande e le risposte possibili, le condizioni con cui compaiono, le regole con cui la mappa viene derivata dalle risposte e le persone di prova passate nel motore. Per capire il progetto, discuterlo e proporre modifiche.</p>
	</div>
	<table><tbody>
		<tr><td>Generato il</td><td>${today}</td></tr>
		<tr><td>Versione delle schede</td><td>${code(CATALOGUE_VERSION)}</td></tr>
		<tr><td>Versione delle regole</td><td>${code(RULES_VERSION)}</td></tr>
		<tr><td>Contenuto</td><td>${catalogue.sheets.length} schede, ${FIELDS.size} domande (${optional} opzionali), ${RULES.length} regole di lettura</td></tr>
		<tr><td>Stato</td><td>${RULES.every((r) => r.approved) ? `<b>Approvata.</b> Tutte le ${RULES.length} regole sono approvate.` : `<b class="warn">Bozza.</b> ${RULES.filter((r) => r.approved).length} regole su ${RULES.length} approvate: finché non lo sono, compaiono solo nelle mappe di prova.`}</td></tr>
	</tbody></table>
</section>

<h2>Indice</h2>
<div class="toc">${SECTIONS.map(([id, t], i) => `<a href="#${id}">${i + 1}. ${esc(t)}</a>`).join('')}</div>

${SECTIONS.map(([id, t, body], i) => `<h2 id="${id}">${i + 1}. ${esc(t)}</h2>\n${body}`).join('\n')}
</body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'audit-'));
const htmlPath = join(dir, 'audit.html');
writeFileSync(htmlPath, html);
execFileSync(
	CHROME,
	[
		'--headless',
		'--disable-gpu',
		'--no-pdf-header-footer',
		'--allow-file-access-from-files',
		`--print-to-pdf=${OUT}`,
		`file://${htmlPath}`
	],
	{ stdio: 'ignore' }
);
console.log(`Wrote ${OUT}`);
