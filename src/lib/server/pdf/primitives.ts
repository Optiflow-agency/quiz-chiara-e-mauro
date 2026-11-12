import type { Clarity, Lens } from '../../map/types.ts';
import type { MapLayoutCopy } from '../../content/map-layout.it.ts';
import { COLOR, SIZE, type Fit } from './theme.ts';

export type FontKey = 'heading' | 'headingItalic' | 'brandItalic' | 'body' | 'bold' | 'display';

/**
 * Everything a drawing helper needs. In a dry run helpers only measure, so a page can be tried
 * at several `fit` levels before anything is drawn.
 */
export interface Ctx {
	pdf: PDFKit.PDFDocument;
	copy: MapLayoutCopy;
	/** The page photographs as PDFKit takes them. */
	images: { masthead: Buffer; horizon: Buffer };
	fit: Fit;
	dry: boolean;
	/** When set, every string drawn whole is recorded here (tests check nothing was cut). */
	printed?: string[];
}

export interface Style {
	font: FontKey;
	size: number;
	color?: string;
	align?: 'left' | 'right' | 'center';
	/** Letter-spacing in em. */
	tracking?: number;
}

export const body = (ctx: Ctx): Style => ({ font: 'body', size: ctx.fit.body });
export const bold = (ctx: Ctx): Style => ({ font: 'bold', size: ctx.fit.body });
/** Secondary text: never larger than the body. */
export const small = (ctx: Ctx): Style => ({
	font: 'body',
	size: Math.min(SIZE.small, ctx.fit.body)
});

export const lineGap = (ctx: Ctx) => (ctx.fit.tight ? 1 : 2.5);
/** Vertical space between paragraphs, or between sections when `big`. */
export const space = (ctx: Ctx, big = false) =>
	big ? (ctx.fit.tight ? 9 : 18) : ctx.fit.tight ? 3 : 7;

export function fill(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ''));
}

/**
 * Draws wrapped text and returns its height. Text is never cut unless the caller passes
 * `maxLines` (only the respondent's own question on page 1 does); then it ends in an ellipsis.
 */
export function text(
	ctx: Ctx,
	str: string,
	x: number,
	y: number,
	width: number,
	style: Style,
	maxLines = Infinity
): number {
	const { pdf } = ctx;
	const gap = lineGap(ctx);
	const characterSpacing = (style.tracking ?? 0) * style.size;
	pdf.font(style.font).fontSize(style.size);
	const lh = pdf.currentLineHeight(true);
	const natural = pdf.heightOfString(str, { width, lineGap: gap, characterSpacing });
	const cap = maxLines * (lh + gap);
	const clipped = natural > cap + 0.5;
	if (!ctx.dry) {
		if (!clipped) ctx.printed?.push(str);
		pdf.fillColor(style.color ?? COLOR.ink).text(str, x, y, {
			width,
			lineGap: gap,
			characterSpacing,
			align: style.align ?? 'left',
			...(clipped ? { height: maxLines * lh + (maxLines - 1) * gap + 0.1, ellipsis: true } : {})
		});
	}
	return clipped ? cap : natural;
}

export interface Run {
	str: string;
	font: FontKey;
	color: string;
}

/**
 * One unwrapped line of mixed fonts and colours (the wordmark, a title with its emphasis word).
 * `tracking` is in em, as the survey's letter-spacing.
 */
export function runs(ctx: Ctx, parts: Run[], x: number, y: number, size: number, tracking = 0) {
	if (ctx.dry) return;
	const { pdf } = ctx;
	const characterSpacing = tracking * size;
	for (const part of parts) {
		pdf.font(part.font).fontSize(size).fillColor(part.color);
		pdf.text(part.str, x, y, { lineBreak: false, characterSpacing });
		x += pdf.widthOfString(part.str, { characterSpacing }) + characterSpacing;
	}
}

/** Section heading: navy Montserrat. Returns its height including the space below. */
export function heading(ctx: Ctx, str: string, x: number, y: number, width: number): number {
	const h = text(ctx, str, x, y, width, { font: 'heading', size: SIZE.heading, color: COLOR.navy });
	return h + space(ctx);
}

export function hline(
	ctx: Ctx,
	x: number,
	y: number,
	width: number,
	weight = 0.6,
	color = COLOR.hairline
) {
	if (ctx.dry) return;
	ctx.pdf
		.lineWidth(weight)
		.strokeColor(color)
		.moveTo(x, y)
		.lineTo(x + width, y)
		.stroke();
}

/**
 * Clarity shape, readable in black and white: filled, half, empty or dashed circle. It always
 * sits next to the state word.
 */
export function clarityShape(ctx: Ctx, state: Clarity, cx: number, cy: number, r = 5.5) {
	if (ctx.dry) return;
	const { pdf } = ctx;
	pdf.save().lineWidth(1.1).strokeColor(COLOR.navy).fillColor(COLOR.navy);
	if (state === 'chiara') {
		pdf.circle(cx, cy, r).fillAndStroke();
	} else if (state === 'in_parte') {
		pdf.circle(cx, cy, r).stroke();
		pdf
			.save()
			.rect(cx - r, cy - r, r, 2 * r)
			.clip()
			.circle(cx, cy, r)
			.fill()
			.restore();
	} else if (state === 'da_ricostruire') {
		pdf.circle(cx, cy, r).stroke();
	} else {
		pdf.dash(1.8, { space: 1.8 }).circle(cx, cy, r).stroke().undash();
	}
	pdf.restore();
}

/** Shape plus word, left-aligned at `x`. Returns the width used. */
export function clarityLabel(ctx: Ctx, state: Clarity, x: number, y: number): number {
	const word = ctx.copy.clarity[state];
	clarityShape(ctx, state, x + 5.5, y + 6.5);
	ctx.pdf.font('bold').fontSize(ctx.fit.body);
	const w = ctx.pdf.widthOfString(word);
	text(ctx, word, x + 16, y, w + 4, bold(ctx));
	return 16 + w;
}

/** Upper-case, tracked section label. Returns its height including the space below. */
export function eyebrow(
	ctx: Ctx,
	str: string,
	x: number,
	y: number,
	width: number,
	color: string = COLOR.navy
): number {
	const style = { font: 'heading', size: SIZE.eyebrow, color, tracking: 0.12 } as const;
	return text(ctx, str.toLocaleUpperCase('it'), x, y, width, style) + (ctx.fit.tight ? 3 : 5);
}

/**
 * Line icon of a perspective in a thin circle, after the moodboard's set: a lens for clarity,
 * waves for coherence, a heading arrow for strategy, a shield for protection, a sprout for
 * transmission. Drawn on a 13pt grid and scaled to radius `r`.
 */
export function lensIcon(ctx: Ctx, lens: Lens, cx: number, cy: number, r = 6.5) {
	if (ctx.dry) return;
	const { pdf } = ctx;
	const k = r / 6.5;
	pdf.save().translate(cx, cy).scale(k);
	pdf
		.lineWidth(0.7 / k)
		.strokeColor(COLOR.navy)
		.fillColor(COLOR.navy);
	pdf.lineCap('round').lineJoin('round');
	pdf.circle(0, 0, 6.5).stroke();
	if (lens === 'chiarezza') {
		pdf.circle(-0.8, -0.8, 2.2).stroke();
		pdf.moveTo(0.8, 0.8).lineTo(2.8, 2.8).stroke();
	} else if (lens === 'coerenza') {
		for (const y of [-1.3, 1.5]) {
			pdf.moveTo(-3.4, y).bezierCurveTo(-2, y - 1.5, -1, y - 1.5, 0, y);
			pdf.bezierCurveTo(1, y + 1.5, 2, y + 1.5, 3.4, y).stroke();
		}
	} else if (lens === 'strategia') {
		pdf.polygon([3, -3], [-3.2, -0.4], [-0.4, 0.4], [0.4, 3.2]).fill();
	} else if (lens === 'protezione') {
		pdf.moveTo(0, -3.6).lineTo(3, -2.4).lineTo(3, 0);
		pdf.bezierCurveTo(3, 2, 1.5, 3.1, 0, 3.8).bezierCurveTo(-1.5, 3.1, -3, 2, -3, 0);
		pdf.lineTo(-3, -2.4).closePath().stroke();
	} else {
		pdf.moveTo(0, 3.6).lineTo(0, -0.6).stroke();
		pdf.moveTo(0, 0.6).bezierCurveTo(-0.4, -1.8, -2, -2.6, -3.2, -2.4);
		pdf.bezierCurveTo(-3, -0.6, -1.6, 0.6, 0, 0.6).stroke();
		pdf.moveTo(0, -0.6).bezierCurveTo(0.4, -2.6, 1.6, -3.4, 3, -3.4);
		pdf.bezierCurveTo(3, -1.6, 1.8, -0.6, 0, -0.6).stroke();
	}
	pdf.restore();
}

/** Icon and name of a perspective on one line, from `x`. Returns the width used. */
export function lensMark(ctx: Ctx, lens: Lens, x: number, y: number): number {
	const word = ctx.copy.lenses[lens];
	lensIcon(ctx, lens, x + 6.5, y + 4.5);
	const style = { font: 'heading', size: SIZE.eyebrow, color: COLOR.navy, tracking: 0.12 } as const;
	const upper = word.toLocaleUpperCase('it');
	ctx.pdf.font(style.font).fontSize(style.size);
	const w = ctx.pdf.widthOfString(upper, { characterSpacing: style.tracking * style.size });
	text(ctx, upper, x + 17, y + 1.5, w + 4, style);
	return 17 + w;
}

/** Numbered blue disc that ties a highlight to its place on the map and its question on page 4. */
export function badge(ctx: Ctx, n: number, cx: number, cy: number, r = 7) {
	if (ctx.dry) return;
	const { pdf } = ctx;
	pdf.save().circle(cx, cy, r).fill(COLOR.blue);
	pdf
		.font('heading')
		.fontSize(r * 1.15)
		.fillColor(COLOR.white);
	const label = String(n);
	const w = pdf.widthOfString(label);
	pdf.text(label, cx - w / 2, cy - r * 0.62, { lineBreak: false }).restore();
}

/** Items under a marker (dash, number or box), all printed whole. Returns the height. */
export function itemList(
	ctx: Ctx,
	items: string[],
	x: number,
	y: number,
	width: number,
	marker: (i: number, x: number, y: number) => void
): number {
	let cy = y;
	items.forEach((item, i) => {
		if (!ctx.dry) marker(i, x, cy);
		cy += text(ctx, item, x + 18, cy, width - 18, body(ctx)) + space(ctx) - 2;
	});
	return cy - y;
}

export const boxMarker = (ctx: Ctx) => (_i: number, x: number, y: number) => {
	ctx.pdf
		.save()
		.lineWidth(1)
		.strokeColor(COLOR.navy)
		.roundedRect(x + 1, y + 2.5, 8, 8, 2)
		.stroke()
		.restore();
};

/** The numbered disc of the highlights, so a question on page 4 points back to the map. */
export const numberMarker = (ctx: Ctx) => (i: number, x: number, y: number) =>
	badge(ctx, i + 1, x + 6, y + 0.62 * ctx.fit.body, 6);
