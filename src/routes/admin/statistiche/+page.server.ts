import { catalogue, CATALOGUE_VERSION } from '$lib/content/sheets.it';
import { buildViews, loadStats, loadVersions, parseFilters, VIEWS } from '$lib/server/metrics';

/** The admin guard in hooks.server.ts has already let only admins through. */
export async function load({ locals, url }) {
	const now = new Date();
	const filters = parseFilters(url.searchParams, now, CATALOGUE_VERSION);
	const admin = locals.createAdminClient();
	try {
		const [raw, seen] = await Promise.all([loadStats(admin, filters), loadVersions(admin)]);
		return {
			filters,
			versions: [...new Set([CATALOGUE_VERSION, filters.version, ...seen])].filter(
				(version) => version !== 'all'
			),
			views: buildViews(raw, catalogue, now),
			order: VIEWS
		};
	} catch (error) {
		console.error('statistics failed', error);
		return { filters, versions: [CATALOGUE_VERSION], views: null, order: VIEWS };
	}
}
