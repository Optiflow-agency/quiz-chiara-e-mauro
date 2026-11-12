import { json } from '@sveltejs/kit';
import { CATALOGUE_VERSION, catalogue } from '$lib/content/sheets.it';
import { hasConsent } from '$lib/server/consent';
import { reconcile } from '$lib/survey/reconcile';
import { sanitizePatch } from '$lib/survey/sanitize';

const MAX_BODY_BYTES = 256 * 1024;

/** Error responses carry a stable `code` the client maps to its own (Italian) copy. */
const failure = (status: number, code: string) => json({ code }, { status });

/**
 * Applies a patch of sheets to the respondent's stored answers: listed sheets are
 * replaced (or deleted when null), every other sheet is left as it is, except answers the patch
 * leaves hidden, which are deleted. Idempotent.
 */
export async function PATCH({ request, locals }) {
	const user = await locals.getUser();
	if (!user) return failure(401, 'unauthenticated');
	if (!(await hasConsent(locals.supabase))) return failure(403, 'consent_required');

	const body = await request.text();
	if (body.length > MAX_BODY_BYTES) return failure(413, 'too_large');
	let input: unknown;
	try {
		input = JSON.parse(body);
	} catch {
		return failure(400, 'invalid_body');
	}
	const patch = sanitizePatch(catalogue, input);
	if (!patch) return failure(400, 'invalid_answers');

	// Read-modify-write: what the patch leaves hidden has to go too, wherever it is stored.
	const { data: rows, error: readFailure } = await locals.supabase
		.from('survey_answers')
		.select('sheet_id, answer');
	if (readFailure) return failure(502, 'storage_unavailable');
	const stored = Object.fromEntries((rows ?? []).map((row) => [row.sheet_id, row.answer]));
	const changes = reconcile(catalogue, stored, patch);

	// Writes go through the service role (no write privilege for respondents); the user and
	// consent were verified above and every row is bound to that user.
	const admin = locals.createAdminClient();
	const upserts = Object.entries(changes).flatMap(([sheetId, answer]) =>
		answer
			? [
					{
						user_id: user.id,
						sheet_id: sheetId,
						answer,
						catalogue_version: CATALOGUE_VERSION
					}
				]
			: []
	);
	const removed = Object.keys(changes).filter((sheetId) => changes[sheetId] === null);

	if (upserts.length > 0) {
		const { error: writeFailure } = await admin
			.from('survey_answers')
			.upsert(upserts, { onConflict: 'user_id,sheet_id' });
		if (writeFailure) return failure(502, 'storage_unavailable');
	}
	if (removed.length > 0) {
		const { error: writeFailure } = await admin
			.from('survey_answers')
			.delete()
			.eq('user_id', user.id)
			.in('sheet_id', removed);
		if (writeFailure) return failure(502, 'storage_unavailable');
	}
	return new Response(null, { status: 204 });
}
