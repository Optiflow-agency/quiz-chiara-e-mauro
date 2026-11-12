import { describe, expect, it } from 'vitest';
import { mapCopy } from '../../content/map.it.ts';
import { mapLayoutIt } from '../../content/map-layout.it.ts';
import { catalogue } from '../../content/sheets.it.ts';
import { buildMap } from '../../map/compose.ts';
import { PERSONAS } from '../../map/personas.ts';
import { RULES, TOPICS } from '../../map/rules.ts';
import { drawMap, renderMap, type MapDeps } from './draw-map.ts';
import { loadFonts, loadImages } from './assets.ts';
import { buildMaxMap } from './max-map.ts';
import { PAGE } from './theme.ts';

const deps: MapDeps = {
	fonts: loadFonts(),
	images: loadImages(),
	copy: mapLayoutIt
};

const personaMap = (index: number, draft = true) =>
	buildMap(PERSONAS[index].answers, {
		bands: catalogue.amountBandSets,
		rules: RULES,
		topics: TOPICS,
		copy: mapCopy,
		now: new Date('2026-10-02T10:00:00Z'),
		draft,
		catalogue: 'test'
	});

/** PDFKit writes one `/Type /Page` object per page; `/Pages` is the tree and is excluded. */
const countPages = (pdf: Uint8Array) =>
	(
		Buffer.from(pdf)
			.toString('latin1')
			.match(/\/Type \/Page\b(?!s)/g) ?? []
	).length;

describe('drawMap', () => {
	for (const [index, persona] of PERSONAS.entries()) {
		it(`draws a four-page PDF for ${persona.name}`, async () => {
			const pdf = await drawMap(personaMap(index), deps);
			expect(Buffer.from(pdf.slice(0, 4)).toString('latin1')).toBe('%PDF');
			expect(countPages(pdf)).toBe(4);
		});
	}

	it(`fits the realistic maximum on four pages with every sentence whole`, async () => {
		const doc = buildMaxMap();
		const { pages, pdf } = await renderMap(doc, deps);
		expect(countPages(pdf)).toBe(4);
		// The realistic maximum needs no cut at all: only tighter spacing and a smaller body.
		expect(pages.every((p) => !p.cutsQuestion)).toBe(true);
		for (const page of pages) {
			expect(page.fits).toBe(true);
			expect(page.bottom).toBeLessThanOrEqual(PAGE.bottom);
		}
		const printed = (page: number) => new Set(pages[page].printed);
		doc.areas.forEach((a, i) => {
			const paragraph = [...a.sentences.map((s) => s.text), ...(a.note ? [a.note] : [])];
			expect(printed(i < 3 ? 1 : 2).has(paragraph.join(' '))).toBe(true);
		});
		for (const h of doc.highlights) expect(printed(0).has(h.text)).toBe(true);
		const { snapshot } = doc;
		for (const whole of [snapshot.context, snapshot.goals, snapshot.reader.chosen ?? '']) {
			expect(printed(0).has(whole)).toBe(true);
		}
		for (const n of snapshot.numbers) expect(printed(0).has(n.value?.figure ?? '')).toBe(true);
		// The highlights' questions are numbered; the person's own is quoted.
		const [own, ...numbered] = [...doc.nextSteps.questions].reverse();
		for (const q of numbered) expect(printed(3).has(q)).toBe(true);
		expect(printed(3).has(`«${own}»`)).toBe(true);
	});

	it('prints the own question whole on page 4', async () => {
		const max = buildMaxMap();
		const question = 'x '.repeat(150).trim();
		const doc = {
			...max,
			snapshot: { ...max.snapshot, reader: { ...max.snapshot.reader, question } },
			nextSteps: {
				...max.nextSteps,
				questions: [...max.nextSteps.questions.slice(0, -1), question]
			}
		};
		const { pages } = await renderMap(doc, deps);
		expect(pages[3].printed).toContain(`«${question}»`);
	});

	it('needs at most tighter spacing for a typical map', async () => {
		const { pages } = await renderMap(personaMap(1), deps);
		expect(pages.every((p) => !p.cutsQuestion && p.body >= 10.5)).toBe(true);
	});

	it('is deterministic: the same input gives the same bytes', async () => {
		const a = await drawMap(personaMap(1), deps);
		const b = await drawMap(personaMap(1), deps);
		expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
	});

	it('draws the draft mark only on drafts', async () => {
		const marked = await drawMap(personaMap(1, true), deps);
		const plain = await drawMap({ ...personaMap(1), draft: false }, deps);
		expect(marked.length).toBeGreaterThan(plain.length);
	});
});
