import type { AreaBlock, Figure, MapDocument, NodeId } from '../../map/types.ts';
import { atlas } from './atlas.ts';
import { drawQr } from './qr.ts';
import {
	body,
	bold,
	small,
	boxMarker,
	clarityShape,
	eyebrow,
	fill,
	hline,
	itemList,
	lensIcon,
	lensMark,
	numberMarker,
	runs,
	space,
	badge,
	text,
	type Ctx
} from './primitives.ts';
import { COLOR, CONTENT_WIDTH, GRID, HEAD, PAGE, SIZE } from './theme.ts';

const X = PAGE.marginX;
const W = CONTENT_WIDTH;
const PAGE_COUNT = 4;

/** A page body draws from the top and returns the y where its content ends. */
export type PageBody = (ctx: Ctx, doc: MapDocument) => number;

/** Chrome colours per ground, as the survey's top bar: page 1 is a dark node, the others light. */
const DARK = {
	fg: COLOR.white,
	muted: COLOR.mutedOnDark,
	accent: COLOR.blueOnDark,
	plus: COLOR.blueOnDark,
	track: COLOR.trackOnDark
};
const LIGHT = {
	fg: COLOR.navy,
	muted: COLOR.muted,
	accent: COLOR.blueDark,
	plus: COLOR.blue,
	track: COLOR.hairline
};

export function formatDate(iso: string, months: readonly string[]): string {
	const [year, month, day] = iso.split('-').map(Number);
	return `${day} ${months[month - 1] ?? ''} ${year}`;
}

/** Page 1's dark band: the paper-wave photograph, full bleed, shaded on the left under the title. */
function masthead(ctx: Ctx) {
	const { pdf } = ctx;
	const { width } = PAGE;
	const height = HEAD.masthead;
	pdf.save().rect(0, 0, width, height).clip();
	pdf.image(ctx.images.masthead, 0, 0, { cover: [width, height], valign: 'center' });
	const shade = pdf.linearGradient(0, 0, width, 0);
	shade.stop(0, COLOR.navyDeep, 0.9).stop(0.65, COLOR.navyDeep, 0);
	pdf.rect(0, 0, width, height).fill(shade);
	pdf.restore();
}

/** Wordmark, date and position, and the progress line: the survey's top bar on paper. */
function topBar(ctx: Ctx, d: MapDocument, page: number, tone: typeof DARK) {
	const { pdf, copy } = ctx;
	const { before, accent, plus } = copy.brand;
	runs(
		ctx,
		[
			{ str: before, font: 'heading', color: tone.fg },
			{ str: accent, font: 'brandItalic', color: tone.fg },
			{ str: plus, font: 'heading', color: tone.plus }
		],
		X,
		HEAD.barY,
		SIZE.wordmark,
		-0.01
	);
	const where = `${formatDate(d.generatedOn, copy.months)} · ${fill(copy.position, { n: page })}`;
	pdf.font('body').fontSize(SIZE.footer).fillColor(tone.muted);
	pdf.text(where, X, HEAD.barY + 1, { width: W, align: 'right', lineBreak: false });
	pdf.rect(X, HEAD.lineY, W, 1.5).fill(tone.track);
	pdf.rect(X, HEAD.lineY, (W * page) / PAGE_COUNT, 1.5).fill(COLOR.blue);
}

/**
 * Top bar and title with its italic emphasis word; page 1 sets them on the navy masthead with
 * the lead under the title. Returns the y where the page content starts.
 */
function pageHead(
	ctx: Ctx,
	d: MapDocument,
	page: number,
	title: { before: string; accent: string; after: string }
): number {
	const dark = page === 1;
	const tone = dark ? DARK : LIGHT;
	if (!ctx.dry) {
		if (dark) masthead(ctx);
		topBar(ctx, d, page, tone);
	}
	runs(
		ctx,
		[
			{ str: title.before, font: 'heading', color: tone.fg },
			{ str: title.accent, font: 'headingItalic', color: tone.accent },
			{ str: title.after, font: 'heading', color: tone.fg }
		],
		X,
		HEAD.titleY,
		dark ? SIZE.display : SIZE.title,
		-0.02
	);
	if (!dark) return HEAD.bodyY;
	text(ctx, ctx.copy.lead, X, HEAD.titleY + 38, W, {
		font: 'bold',
		size: 11,
		color: COLOR.textOnDark
	});
	return HEAD.masthead + space(ctx, true);
}

/** Height of the map on page 1; it never shrinks, the text around it does. */
const ATLAS_H = 262;
/** The narrow column, right of the map and of the highlights. */
const RX = X + GRID.wide + GRID.gutter;

/** Quoted question: a blue bar on the left and guillemets around the respondent's own words. */
function quote(ctx: Ctx, str: string, x: number, y: number, w: number, maxLines = Infinity) {
	const h = text(ctx, `«${str}»`, x + 10, y, w - 10, small(ctx), maxLines);
	if (!ctx.dry) ctx.pdf.rect(x + 1, y + 1, 2, h - 3).fill(COLOR.blue);
	return h;
}

/** One number of page 1: its label, the words before it, the figure large in Montserrat Light. */
function figureCell(ctx: Ctx, label: string, value: Figure | null, y: number): number {
	const top = y;
	hline(ctx, RX, y, GRID.narrow, 0.5);
	y += 6;
	y += eyebrow(ctx, label, RX, y, GRID.narrow);
	if (value?.lead) {
		y += text(ctx, value.lead, RX, y, GRID.narrow, { ...small(ctx), color: COLOR.muted });
	}
	const figure = value?.figure ?? ctx.copy.fallback.notComputable;
	const size = value ? SIZE.figure : 12;
	y += text(ctx, figure, RX, y, GRID.narrow, {
		font: 'display',
		size,
		color: value ? COLOR.navy : COLOR.muted
	});
	return y - top + (ctx.fit.tight ? 4 : 8);
}

/** A highlight: its number, its perspective, the sentence. */
function highlightRow(ctx: Ctx, i: number, reading: AreaBlock['sentences'][number], y: number) {
	const indent = 22;
	badge(ctx, i + 1, X + 7, y + 4.5);
	lensMark(ctx, reading.lens, X + indent, y);
	const h = text(ctx, reading.text, X + indent, y + 13, GRID.wide - indent, body(ctx));
	return 13 + h;
}

/** "Per chi legge la mappa con te": the note for the consultant, beside the highlights. */
function readerNote(ctx: Ctx, d: MapDocument, y: number): number {
	const { chosen, improve, question } = d.snapshot.reader;
	const top = y;
	if (!chosen && !improve && !question) return 0;
	const note = { ...small(ctx), color: COLOR.ink };
	y += eyebrow(ctx, ctx.copy.sections.forReader, RX, y, GRID.narrow);
	if (chosen) y += text(ctx, chosen, RX, y, GRID.narrow, note) + space(ctx);
	// The only text that may be cut: the respondent's own words (page 4 prints them whole).
	for (const [label, own] of [
		[ctx.copy.reader.improve, improve],
		[ctx.copy.reader.question, question]
	] as const) {
		if (!own) continue;
		y += text(ctx, `${label}:`, RX, y, GRID.narrow, note);
		y += quote(ctx, own, RX, y, GRID.narrow, ctx.fit.questionLines);
	}
	return y - top;
}

/** The five perspectives, icon and meaning, in three columns. */
function legend(ctx: Ctx, y: number): number {
	const { copy } = ctx;
	const lenses = Object.keys(copy.lensLegend) as (keyof typeof copy.lensLegend)[];
	const colW = (W - 2 * GRID.gutter) / 3;
	const style = { ...small(ctx), size: Math.min(8, ctx.fit.body), color: COLOR.muted };
	let rowH = 0;
	let top = y;
	lenses.forEach((lens, i) => {
		const col = i % 3;
		if (col === 0 && i > 0) {
			top += rowH + 4;
			rowH = 0;
		}
		const cx = X + col * (colW + GRID.gutter);
		lensIcon(ctx, lens, cx + 6, top + 5.5, 5.5);
		const line = `${copy.lenses[lens]}: ${copy.lensLegend[lens]}`;
		rowH = Math.max(rowH, text(ctx, line, cx + 16, top + 1, colW - 16, style));
	});
	return top + rowH - y;
}

export const summaryPage: PageBody = (ctx, d) => {
	const { copy } = ctx;
	const big = space(ctx, true);
	const s = d.snapshot;
	let y = pageHead(ctx, d, 1, copy.pages.summary);

	if (s.context) {
		y += eyebrow(ctx, copy.sections.start, X, y, W);
		y += text(ctx, s.context, X, y, W, body(ctx)) + big;
	}

	// The map, and the four numbers beside it.
	const atlasH = atlas(ctx, d, X, y, GRID.wide, ATLAS_H);
	let ny = y;
	s.numbers.forEach((n) => (ny += figureCell(ctx, n.label, n.value, ny)));
	y += atlasH + 4;
	const caption = { ...small(ctx), size: Math.min(8, ctx.fit.body), color: COLOR.muted };
	y += text(ctx, copy.atlas.caption, X, y, GRID.wide, caption);
	y = Math.max(y, ny) + big;

	// The highlights and the goals, with the note for the reader beside them.
	const rowTop = y;
	y += eyebrow(ctx, copy.sections.highlights, X, y, GRID.wide);
	if (d.highlights.length === 0) {
		y += text(ctx, copy.fallback.noHighlights, X, y, GRID.wide, body(ctx));
	}
	d.highlights.forEach((r, i) => (y += highlightRow(ctx, i, r, y) + space(ctx)));
	if (s.goals) {
		y += big - space(ctx);
		y += eyebrow(ctx, copy.sections.goals, X, y, GRID.wide);
		y += text(ctx, s.goals, X, y, GRID.wide, body(ctx));
	}
	y = Math.max(y, rowTop + readerNote(ctx, d, rowTop)) + big;

	hline(ctx, X, y - big / 2, W, 0.5);
	y += legend(ctx, y);
	if (d.incomplete) {
		y += space(ctx, true) - 4;
		const h = text(ctx, copy.fallback.incomplete, X + 14, y, W - 14, bold(ctx));
		if (!ctx.dry) ctx.pdf.rect(X + 2, y, 2.5, h - 2).fill(COLOR.navy);
		y += h;
	}
	return y;
};

/** Names of the places a paragraph is linked to, as the map labels them. */
function linkedNames(ctx: Ctx, d: MapDocument, area: AreaBlock): string[] {
	const ids = new Set<NodeId>(area.sentences.flatMap((s) => s.links));
	const name = (id: NodeId) =>
		id === 'VOI'
			? ctx.copy.atlas.you
			: id === 'OB'
				? ctx.copy.atlas.goals
				: (d.areas.find((a) => a.id === id)?.title ?? id);
	return [...ids].map(name);
}

/**
 * The map's node and the title, the state on the right; then the perspectives of the paragraph
 * and the places it is linked to; then the paragraph, indented under the title.
 */
function areaBlock(ctx: Ctx, d: MapDocument, area: AreaBlock, y: number): number {
	const { copy } = ctx;
	const top = y;
	const indent = 26;
	const tx = X + indent;
	const tw = W - indent;
	hline(ctx, X, y, W, 0.5);
	y += 12;
	clarityShape(ctx, area.notApplicable ? 'non_compilata' : area.clarity, X + 9, y + 8, 8);
	const state = area.notApplicable ?? copy.clarity[area.clarity];
	const stateW = area.notApplicable ? 300 : 150;
	text(ctx, state, X + W - stateW, y + 4, stateW, {
		...small(ctx),
		color: COLOR.muted,
		align: 'right'
	});
	y +=
		text(ctx, area.title, tx, y, tw - stateW, { font: 'heading', size: 15, color: COLOR.navy }) + 4;
	if (area.notApplicable) return y - top;

	let mx = tx;
	for (const lens of new Set(area.sentences.map((s) => s.lens))) {
		mx += lensMark(ctx, lens, mx, y) + 14;
	}
	const linked = linkedNames(ctx, d, area);
	if (linked.length > 0) {
		const line = `${copy.atlas.linked}: ${linked.join(', ')}`;
		const style = { ...small(ctx), size: 8, color: COLOR.muted };
		ctx.pdf.font(style.font).fontSize(style.size);
		// Beside the perspectives when it fits, otherwise on a line of its own under them.
		if (mx > tx && mx + ctx.pdf.widthOfString(line) > X + W) {
			mx = tx;
			y += 16;
		}
		y += text(ctx, line, mx, y + 1, X + W - mx, style) - 10;
	}
	if (area.sentences.length > 0 || linked.length > 0) y += 18;

	const sentences = area.sentences.map((s) => s.text);
	const paragraph = [
		...(sentences.length > 0 ? sentences : [copy.fallback.emptyArea]),
		...(area.note ? [area.note] : [])
	];
	y += text(ctx, paragraph.join(' '), tx, y, tw, body(ctx));
	return y - top;
}

/** Pages 2 and 3: three area blocks each, `first` being the index of the first one. */
/** Widest space between two area blocks. */
const AREA_GAP_MAX = 56;

export const areasPage =
	(first: number): PageBody =>
	(ctx, d) => {
		let y = pageHead(ctx, d, 2 + first / 3, ctx.copy.pages.areas) + 6;
		const areas = d.areas.slice(first, first + 3);
		// Short paragraphs spread down the page rather than leave its lower half empty.
		const measure = { ...ctx, dry: true };
		const used = areas.reduce((sum, a) => sum + areaBlock(measure, d, a, 0), 0);
		const gap = Math.min(
			AREA_GAP_MAX,
			Math.max(space(ctx, true), (PAGE.bottom - y - used) / areas.length)
		);
		for (const area of areas) y += areaBlock(ctx, d, area, y) + gap;
		return y - gap + space(ctx, true);
	};

/** Page 4 ends on the horizon photograph with the invitation. */
export const darkFooter = (page: number) => page === PAGE_COUNT;

/** The horizon band runs to the bottom edge: as tall as the photograph, never below `min`. */
const HORIZON = { gap: 24, min: 250, max: (PAGE.width * 2) / 3 };

/**
 * Invitation: the horizon photograph, full bleed from `top` to the bottom edge, shaded into navy
 * at the top for the text and at the bottom for the footer; the QR code to the contact page sits
 * on a white tile.
 */
function invitation(ctx: Ctx, top: number) {
	const { pdf } = ctx;
	const { width, height } = PAGE;
	const band = height - top;
	if (!ctx.dry) {
		pdf.save().rect(0, top, width, band).clip();
		pdf.image(ctx.images.horizon, 0, top, { cover: [width, band], valign: 'bottom' });
		const sky = pdf.linearGradient(0, top, 0, top + 0.6 * band);
		sky.stop(0, COLOR.navyDeep, 0.92).stop(1, COLOR.navyDeep, 0);
		pdf.rect(0, top, width, band).fill(sky);
		const ground = pdf.linearGradient(0, height - 90, 0, height);
		ground.stop(0, COLOR.navyDeep, 0).stop(1, COLOR.navyDeep, 0.85);
		pdf.rect(0, height - 90, width, 90).fill(ground);
		pdf.restore();
	}
	const tile = 100;
	const y = top + 32;
	const textW = W - tile - 32;
	const { invitation, contactUrl, credentials } = ctx.copy.closing;
	const h = text(ctx, invitation, X, y, textW, {
		font: 'heading',
		size: 14,
		color: COLOR.white
	});
	const urlY = y + h + 10;
	const urlH = text(ctx, contactUrl, X, urlY, textW, { ...small(ctx), color: COLOR.blueOnDark });
	text(ctx, credentials, X, urlY + urlH + 10, textW, { ...small(ctx), color: COLOR.white });
	const qx = X + W - tile;
	if (!ctx.dry) pdf.roundedRect(qx, y, tile, tile, 8).fill(COLOR.white);
	drawQr(ctx, contactUrl, qx + 4, y + 4, tile - 8);
}

export const nextPage: PageBody = (ctx, d) => {
	const { copy } = ctx;
	const big = space(ctx, true);
	let y = pageHead(ctx, d, PAGE_COUNT, copy.pages.next) + 8;

	// The highlights' questions carry their numbers from page 1; the person's own comes last.
	const numbered = d.nextSteps.questions.slice(0, d.highlights.length);
	const own = d.nextSteps.questions.slice(d.highlights.length);
	if (d.nextSteps.questions.length > 0) {
		y += eyebrow(ctx, copy.sections.questions, X, y, W) + 2;
		y += itemList(ctx, numbered, X, y, W, numberMarker(ctx));
		for (const q of own) y += quote(ctx, q, X, y, W) + space(ctx);
		y += big;
	}
	if (d.nextSteps.gather.length > 0) {
		y += eyebrow(ctx, copy.sections.gather, X, y, W) + 2;
		y += itemList(ctx, d.nextSteps.gather, X, y, W, boxMarker(ctx)) + big;
	}

	const top = Math.max(y + HORIZON.gap - big, PAGE.height - HORIZON.max);
	invitation(ctx, top);
	// The band reaches the bottom edge; the page fits when it keeps at least `min` above it.
	return y + HORIZON.gap - big + HORIZON.min - (PAGE.height - PAGE.bottom);
};
