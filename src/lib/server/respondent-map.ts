import type { SupabaseClient } from '@supabase/supabase-js';
import { mapCopy } from '$lib/content/map.it';
import { mapLayoutIt } from '$lib/content/map-layout.it';
import { CATALOGUE_VERSION, catalogue } from '$lib/content/sheets.it';
import { buildMap } from '$lib/map/compose';
import { RULES, TOPICS } from '$lib/map/rules';
import { drawMap } from './pdf/draw-map';
import { readFonts, readImages } from './pdf/kit-assets';

/** Renders the stored answers of `id` as the four-page map. Null when the answers cannot be read. */
export async function renderRespondentMap(
	admin: SupabaseClient,
	id: string,
	{ draft, now }: { draft: boolean; now: Date }
): Promise<Uint8Array | null> {
	const { data: rows, error } = await admin
		.from('survey_answers')
		.select('sheet_id, answer')
		.eq('user_id', id);
	if (error) return null;

	const doc = buildMap(Object.fromEntries(rows.map((row) => [row.sheet_id, row.answer])), {
		bands: catalogue.amountBandSets,
		rules: RULES,
		topics: TOPICS,
		copy: mapCopy,
		now,
		draft,
		catalogue: CATALOGUE_VERSION
	});
	const [fonts, images] = await Promise.all([readFonts(), readImages()]);
	return drawMap(doc, { fonts, images, copy: mapLayoutIt });
}
