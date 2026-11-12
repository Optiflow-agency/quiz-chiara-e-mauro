// Renders the nine personas of docs/map-spec.md section 9 to .samples/ (git-ignored), through
// the real engine (draft mode: unapproved rules shown) and the real catalogue bands.
// Run with: node scripts/map-samples.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { mapCopy } from '../src/lib/content/map.it.ts';
import { mapLayoutIt } from '../src/lib/content/map-layout.it.ts';
import { CATALOGUE_VERSION, catalogue } from '../src/lib/content/sheets.it.ts';
import { buildMap } from '../src/lib/map/compose.ts';
import { PERSONAS } from '../src/lib/map/personas.ts';
import { RULES, TOPICS } from '../src/lib/map/rules.ts';
import { renderMap } from '../src/lib/server/pdf/draw-map.ts';
import { loadFonts, loadImages } from '../src/lib/server/pdf/assets.ts';

const out = new URL('../.samples/', import.meta.url);
mkdirSync(out, { recursive: true });
const deps = {
	fonts: loadFonts(),
	images: loadImages(),
	copy: mapLayoutIt
};

for (const persona of PERSONAS) {
	const doc = buildMap(persona.answers, {
		bands: catalogue.amountBandSets,
		rules: RULES,
		topics: TOPICS,
		copy: mapCopy,
		now: new Date(),
		draft: true,
		catalogue: CATALOGUE_VERSION
	});
	const { pdf, pages } = await renderMap(doc, deps);
	const file = `map-${persona.name.toLowerCase().replaceAll(' ', '-')}.pdf`;
	writeFileSync(new URL(file, out), pdf);
	console.log(
		file,
		`${pdf.length} bytes; fit level per page`,
		pages.map((p) => `${p.level} (${p.body}pt)${p.fits ? '' : ' OVERFLOW'}`).join(', ')
	);
}
