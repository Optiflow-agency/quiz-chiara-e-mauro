// Assembles the review booklet: for each persona of docs/map-spec.md section 9, a page with who
// the persona is and every answer as the survey words it, then the map that persona would get
// (draft mode: unapproved rules shown). Writes .samples/mappe-revisione.pdf (git-ignored).
// Run with: node scripts/map-review.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import PDFDocument from 'pdfkit';
import { PDFDocument as PdfLib } from 'pdf-lib';
import { mapCopy } from '../src/lib/content/map.it.ts';
import { mapLayoutIt } from '../src/lib/content/map-layout.it.ts';
import { messages } from '../src/lib/content/messages.it.ts';
import { CATALOGUE_VERSION, catalogue } from '../src/lib/content/sheets.it.ts';
import { buildMap } from '../src/lib/map/compose.ts';
import type { MapAnswers } from '../src/lib/map/facts.ts';
import { PERSONAS, type Persona } from '../src/lib/map/personas.ts';
import { RULES, TOPICS } from '../src/lib/map/rules.ts';
import type { CatalogueField } from '../src/lib/survey/catalogue.ts';
import { loadFonts, loadImages } from '../src/lib/server/pdf/assets.ts';
import { renderMap } from '../src/lib/server/pdf/draw-map.ts';
import { eyebrow, text, type Ctx } from '../src/lib/server/pdf/primitives.ts';
import { COLOR, CONTENT_WIDTH, GRID, LADDER, PAGE } from '../src/lib/server/pdf/theme.ts';

const deps = {
	fonts: loadFonts(),
	images: loadImages(),
	copy: mapLayoutIt
};
const X = PAGE.marginX;
const COL_W = (CONTENT_WIDTH - GRID.gutter) / 2;
const ESCAPES: Record<string, string> = messages.field;

/** An answer as the survey shows it: option or band labels, the escapes, free text quoted. */
function answerLabel(field: CatalogueField, raw: unknown): string {
	if (field.type === 'textarea') return `«${String(raw)}»`;
	const options = field.type === 'band' ? catalogue.amountBandSets[field.band_set] : field.options;
	const label = (v: unknown) =>
		ESCAPES[String(v)] ?? options.find((o) => o.value === v)?.label ?? String(v);
	return Array.isArray(raw) ? raw.map(label).join('; ') : label(raw);
}

/** Each scheda with the answers given in it; a scheda with none says so. */
function answerBlocks(answers: MapAnswers) {
	return catalogue.sheets.map((sheet) => ({
		title: `${sheet.id} · ${sheet.prompt}`,
		rows: sheet.fields.flatMap((field) => {
			const raw = answers[sheet.id]?.[field.id];
			return raw === undefined ? [] : [{ q: field.label, a: answerLabel(field, raw) }];
		})
	}));
}

/** The persona page, drawn with the map's own fonts and primitives. */
function personaPage(persona: Persona, index: number): Promise<Uint8Array> {
	const pdf = new PDFDocument({ size: 'A4', margin: 0, font: false as unknown as undefined });
	for (const [key, bytes] of Object.entries(deps.fonts)) pdf.registerFont(key, Buffer.from(bytes));
	const chunks: Buffer[] = [];
	pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
	const done = new Promise<Uint8Array>((resolve) =>
		pdf.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))))
	);
	const images = {
		masthead: Buffer.from(deps.images.masthead),
		horizon: Buffer.from(deps.images.horizon)
	};
	const ctx: Ctx = { pdf, copy: mapLayoutIt, images, fit: LADDER[0], dry: false };
	const measure: Ctx = { ...ctx, dry: true };

	pdf.rect(0, 0, PAGE.width, PAGE.height).fill(COLOR.paper);
	let y = 44;
	y += eyebrow(
		ctx,
		`Bozza per la revisione · persona ${index + 1} di ${PERSONAS.length}`,
		X,
		y,
		CONTENT_WIDTH,
		COLOR.blueDark
	);
	const name = persona.name.replace(/^P\d+\s+/, '');
	y += text(ctx, name, X, y + 4, CONTENT_WIDTH, { font: 'heading', size: 26, color: COLOR.navy });
	y += 10;
	y += text(ctx, persona.summary, X, y, CONTENT_WIDTH, { font: 'body', size: 12 }) + 8;
	const note =
		'Persona inventata. Le pagine che seguono sono la mappa che riceverebbe, in bozza: compaiono anche le letture non ancora approvate.';
	y += text(ctx, note, X, y, CONTENT_WIDTH, { font: 'body', size: 9, color: COLOR.muted }) + 18;

	pdf.rect(X, y, CONTENT_WIDTH, 0.5).fill(COLOR.hairline);
	y += 10;
	y += eyebrow(ctx, 'Le risposte date', X, y, CONTENT_WIDTH);

	// Two columns; a scheda never splits, the left one takes schede until half the height. Each
	// answer sits on the line of its question; the size steps down until the page holds them all.
	const blocks = answerBlocks(persona.answers);
	const row = (
		draw: boolean,
		size: number,
		r: { q: string; a: string },
		x: number,
		top: number
	) => {
		const lineGap = 1;
		pdf.font('bold').fontSize(size);
		// Measured all in bold: a little taller than drawn, never shorter.
		const h = pdf.heightOfString(`${r.q} ${r.a}`, { width: COL_W, lineGap });
		if (draw) {
			pdf.font('body').fillColor(COLOR.muted);
			pdf.text(`${r.q} `, x, top, { width: COL_W, lineGap, continued: true });
			pdf.font('bold').fillColor(COLOR.ink).text(r.a, { lineGap });
		}
		return h + 2;
	};
	const block = (draw: boolean, size: number, bi: number, x: number, top: number) => {
		const c = draw ? ctx : measure;
		const head = { font: 'heading', size, color: COLOR.navy } as const;
		let by = top + text(c, blocks[bi].title, x, top, COL_W, head) + 2;
		if (blocks[bi].rows.length === 0) {
			by += text(c, 'Non compilata', x, by, COL_W, { font: 'body', size, color: COLOR.muted });
		}
		for (const r of blocks[bi].rows) by += row(draw, size, r, x, by);
		return by - top + 7;
	};
	const columns = (draw: boolean, size: number) => {
		const heights = blocks.map((_, i) => block(false, size, i, 0, 0));
		const half = heights.reduce((sum, h) => sum + h, 0) / 2;
		let [left, right, used] = [y, y, 0];
		heights.forEach((h, i) => {
			const inLeft = used + h / 2 <= half;
			used += h;
			if (inLeft) left += draw ? block(true, size, i, X, left) : h;
			else right += draw ? block(true, size, i, X + COL_W + GRID.gutter, right) : h;
		});
		return Math.max(left, right);
	};
	const size = [8.5, 8, 7.5, 7, 6.5].find((s) => columns(false, s) <= PAGE.height - 36) ?? 6.5;
	columns(true, size);
	pdf.end();
	return done;
}

const out = new URL('../.samples/', import.meta.url);
mkdirSync(out, { recursive: true });
const booklet = await PdfLib.create();
booklet.setTitle('La tua mappa: bozze per la revisione');

for (const [index, persona] of PERSONAS.entries()) {
	const doc = buildMap(persona.answers, {
		bands: catalogue.amountBandSets,
		rules: RULES,
		topics: TOPICS,
		copy: mapCopy,
		now: new Date(),
		draft: true,
		catalogue: CATALOGUE_VERSION
	});
	const { pdf } = await renderMap(doc, deps);
	for (const bytes of [await personaPage(persona, index), pdf]) {
		const part = await PdfLib.load(bytes);
		const pages = await booklet.copyPages(part, part.getPageIndices());
		for (const page of pages) booklet.addPage(page);
	}
}

const file = new URL('mappe-revisione.pdf', out);
writeFileSync(file, await booklet.save());
console.log(`${file.pathname}: ${booklet.getPageCount()} pages`);
