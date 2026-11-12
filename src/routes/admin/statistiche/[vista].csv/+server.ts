import { error } from '@sveltejs/kit';
import { catalogue, CATALOGUE_VERSION } from '$lib/content/sheets.it';
import { buildViews, loadStats, parseFilters, toCsv, VIEWS } from '$lib/server/metrics';

/** One view as aggregated CSV rows, under the same filters as the page. Guarded with /admin. */
export async function GET({ params, locals, url }) {
	const view = VIEWS.find((v) => v === params.vista);
	if (!view) error(404);
	const now = new Date();
	const filters = parseFilters(url.searchParams, now, CATALOGUE_VERSION);
	let table;
	try {
		table = buildViews(await loadStats(locals.createAdminClient(), filters), catalogue, now)[view];
	} catch (e) {
		console.error('statistics export failed', e);
		error(500);
	}
	return new Response(toCsv(table), {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="statistiche-${view}.csv"`,
			'cache-control': 'no-store'
		}
	});
}
