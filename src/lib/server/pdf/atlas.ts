import type { MapDocument, NodeId } from '../../map/types.ts';
import { badge, clarityShape, text, type Ctx } from './primitives.ts';
import { COLOR } from './theme.ts';

/**
 * The map of page 1: the household at the centre, the goals and the six areas around it. Each
 * area is drawn with as many contour lines as its picture is complete (a state, never a
 * judgement); a line joins two places when a printed reading draws on both, and the highlights
 * are those lines in blue, numbered.
 */

/** Clockwise from the top: the goals, then the six areas in print order. */
const RING: NodeId[] = ['OB', 'IO', 'RI', 'DE', 'SA', 'PR', 'PE'];
const NODE_R = 9;
const HUB_R = 21;
const LABEL_W = 100;
const CONTOURS = { chiara: 3, in_parte: 2, da_ricostruire: 1, non_compilata: 0 };
/**
 * Where along its line, from its own area, each highlight's number sits: near the area it belongs
 * to, and apart when two share a line.
 */
const BADGE_AT = [0.3, 0.2, 0.4];

interface Point {
	x: number;
	y: number;
}

/** A closed, gently irregular loop: the contour lines and the layered ground. */
function loop(
	pdf: PDFKit.PDFDocument,
	c: Point,
	rx: number,
	ry: number,
	seed: number,
	wobble = 0.06
) {
	const steps = 72;
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * 2 * Math.PI;
		const f = 1 + wobble * (0.6 * Math.sin(3 * t + seed) + 0.4 * Math.sin(5 * t + 2.1 * seed));
		const x = c.x + rx * f * Math.cos(t);
		const y = c.y + ry * f * Math.sin(t);
		if (i === 0) pdf.moveTo(x, y);
		else pdf.lineTo(x, y);
	}
	return pdf.closePath();
}

/** Lines bend towards the centre, as paths on a map; a line to the centre is straight. */
function control(a: Point, b: Point, c: Point, straight: boolean): Point {
	const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	return straight ? mid : { x: mid.x + 0.4 * (c.x - mid.x), y: mid.y + 0.4 * (c.y - mid.y) };
}

function pointOn(a: Point, k: Point, b: Point, t: number): Point {
	const u = 1 - t;
	return {
		x: u * u * a.x + 2 * u * t * k.x + t * t * b.x,
		y: u * u * a.y + 2 * u * t * k.y + t * t * b.y
	};
}

/**
 * Draws the map in the box and returns the height it takes: the box, or more when a label below
 * a lower place runs past it (a long area title on two lines), so what follows starts below.
 */
export function atlas(ctx: Ctx, d: MapDocument, x: number, y: number, w: number, h: number) {
	const { copy } = ctx;
	const c = { x: x + w / 2, y: y + h / 2 };
	const rx = w / 2 - LABEL_W / 2 - 4;
	const ry = h / 2 - 36;
	const at = new Map<NodeId, Point>([['VOI', c]]);
	RING.forEach((id, i) => {
		const a = -Math.PI / 2 + (i * 2 * Math.PI) / RING.length;
		at.set(id, { x: c.x + rx * Math.cos(a), y: c.y + ry * Math.sin(a) });
	});
	const pos = (id: NodeId) => at.get(id)!;
	const stateOf = (area: MapDocument['areas'][number]) =>
		area.notApplicable ? copy.atlas.notApplicable : copy.clarity[area.clarity];
	const measure = { ...ctx, dry: true };
	const bottom = Math.max(
		y + h,
		...d.areas.map((area) => label(measure, pos(area.id), c, area.title, stateOf(area)))
	);
	if (ctx.dry) return bottom - y;
	const { pdf } = ctx;
	const line = (a: NodeId, b: NodeId) => {
		const [p, q] = [pos(a), pos(b)];
		return { p, k: control(p, q, c, a === 'VOI' || b === 'VOI'), q };
	};

	// The ground, kept inside the box: three layers deepening towards the centre, faint contours.
	pdf.save().rect(x, y, w, h).clip();
	[
		[0.93, COLOR.ice],
		[0.66, COLOR.iceDeep],
		[0.4, COLOR.iceDeeper]
	].forEach(([s, color], i) => {
		loop(pdf, c, (w / 2) * Number(s), (h / 2) * Number(s), i + 1, 0.05);
		pdf.fillColor(String(color), 0.6).fill();
	});
	pdf.lineWidth(0.4).strokeColor(COLOR.hairline, 0.55);
	for (const s of [0.27, 0.53, 0.8]) loop(pdf, c, (w / 2) * s, (h / 2) * s, 7 * s, 0.07).stroke();
	pdf.restore();

	// Contour lines around each area, as many as its picture is complete.
	pdf.save().lineWidth(0.5).strokeColor(COLOR.blueDark, 0.5);
	d.areas.forEach((area, i) => {
		const n = area.notApplicable ? 0 : CONTOURS[area.clarity];
		for (let k = 1; k <= n; k++) {
			const r = NODE_R + 1 + 4.5 * k;
			loop(pdf, pos(area.id), r, r, 3 * i + k, 0.1).stroke();
		}
	});
	pdf.restore();

	// Every link of a printed reading, then the highlights over them.
	const pairs = new Map<string, [NodeId, NodeId]>();
	for (const r of [...d.areas.flatMap((a) => a.sentences), ...d.highlights]) {
		for (const link of r.links) pairs.set([r.area, link].sort().join(), [r.area, link]);
	}
	pdf.save().lineWidth(0.6).strokeColor(COLOR.navy, 0.45);
	for (const [a, b] of pairs.values()) {
		const { p, k, q } = line(a, b);
		pdf.moveTo(p.x, p.y).quadraticCurveTo(k.x, k.y, q.x, q.y).stroke();
	}
	pdf.lineWidth(1.3).strokeColor(COLOR.blue);
	for (const r of d.highlights) {
		for (const link of r.links) {
			const { p, k, q } = line(r.area, link);
			pdf.moveTo(p.x, p.y).quadraticCurveTo(k.x, k.y, q.x, q.y).stroke();
		}
	}
	pdf.restore();

	// The places.
	pdf
		.save()
		.lineWidth(0.6)
		.strokeColor(COLOR.blue, 0.5)
		.circle(c.x, c.y, HUB_R + 4)
		.stroke();
	pdf.circle(c.x, c.y, HUB_R).fill(COLOR.navy).restore();
	text(ctx, copy.atlas.you, c.x - HUB_R, c.y - 6, 2 * HUB_R, {
		font: 'heading',
		size: 10,
		color: COLOR.white,
		align: 'center'
	});

	const goals = pos('OB');
	pdf
		.save()
		.circle(goals.x, goals.y, NODE_R + 2)
		.fill(COLOR.paper);
	pdf.lineWidth(1.1).strokeColor(COLOR.navy).fillColor(COLOR.navy);
	if (d.snapshot.goals) {
		pdf.circle(goals.x, goals.y, NODE_R).stroke();
		pdf.circle(goals.x, goals.y, NODE_R * 0.45).fill();
	} else {
		pdf.dash(1.8, { space: 1.8 }).circle(goals.x, goals.y, NODE_R).stroke().undash();
	}
	pdf.restore();
	label(ctx, goals, c, copy.atlas.goals, d.snapshot.goals ? '' : copy.atlas.noGoals);

	for (const area of d.areas) {
		const p = pos(area.id);
		pdf.circle(p.x, p.y, NODE_R + 2).fill(COLOR.paper);
		clarityShape(ctx, area.notApplicable ? 'non_compilata' : area.clarity, p.x, p.y, NODE_R);
		label(ctx, p, c, area.title, stateOf(area));
	}

	// Numbers last, so nothing covers them: on the highlight's first line, or beside its area.
	d.highlights.forEach((r, i) => {
		const spot = r.links.length
			? (({ p, k, q }) => pointOn(p, k, q, BADGE_AT[i]))(line(r.area, r.links[0]))
			: // Beside the node on the side away from its label.
				{ x: pos(r.area).x + 13, y: pos(r.area).y + (pos(r.area).y < c.y - 1 ? 11 : -11) };
		badge(ctx, i + 1, spot.x, spot.y);
	});
	return bottom - y;
}

/**
 * Title and state of a place, above it in the upper half of the map and below in the lower.
 * Returns where the label ends (in a dry run it only measures).
 */
function label(ctx: Ctx, p: Point, c: Point, title: string, state: string): number {
	const titleStyle = { font: 'heading', size: 8, color: COLOR.navy, align: 'center' } as const;
	const stateStyle = { font: 'body', size: 7.5, color: COLOR.muted, align: 'center' } as const;
	const measure = { ...ctx, dry: true };
	const lx = p.x - LABEL_W / 2;
	const th = text(measure, title, lx, 0, LABEL_W, titleStyle);
	const sh = state ? text(measure, state, lx, 0, LABEL_W, stateStyle) : 0;
	const top = p.y < c.y - 1 ? p.y - NODE_R - 5 - th - sh : p.y + NODE_R + 5;
	text(ctx, title, lx, top, LABEL_W, titleStyle);
	if (state) text(ctx, state, lx, top + th, LABEL_W, stateStyle);
	return top + th + sh;
}
