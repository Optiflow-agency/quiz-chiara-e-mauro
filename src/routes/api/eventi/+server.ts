import type { RequestHandler } from './$types';
import { CATALOGUE_VERSION, catalogue } from '$lib/content/sheets.it';
import { MAX_BODY_BYTES } from '$lib/metrics/events';
import { isAdmin } from '$lib/server/admin';
import { hasConsent } from '$lib/server/consent';
import { countScreens, parseBatch, recordEvents } from '$lib/server/metrics-ingest';

const noContent = () => new Response(null, { status: 204 });

/** Survey metrics. Always answers 204: the client learns nothing about what was kept. */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return noContent();
		const text = await request.text();
		if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return noContent();
		const batch = parseBatch(catalogue, JSON.parse(text));
		if (!batch) return noContent();

		const admin = locals.createAdminClient();
		const user = await locals.getUser();
		if (await isAdmin(admin, user)) return noContent();

		if (!(await countScreens(admin, CATALOGUE_VERSION, batch))) {
			console.error('metrics: counting screens failed');
		}
		if (user && batch.events.length > 0 && (await hasConsent(locals.supabase))) {
			if (!(await recordEvents(admin, user.id, CATALOGUE_VERSION, batch, () => new Date()))) {
				console.error('metrics: recording events failed');
			}
		}
	} catch {
		console.error('metrics: request failed');
	}
	return noContent();
};
