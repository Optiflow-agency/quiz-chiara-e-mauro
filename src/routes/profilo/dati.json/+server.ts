import { json } from '@sveltejs/kit';
import { logAccess } from '$lib/server/access-log';

/** Error responses carry a stable `code`, like the answers API. */
const failure = (status: number, code: string) => json({ code }, { status });

/**
 * GDPR data export: everything stored about the signed-in respondent. The export is written to
 * `access_logs` first, and a failed log write means no export. Reads go through the user's
 * client, so RLS limits them to their own rows.
 */
export async function GET({ locals }) {
	const user = await locals.getUser();
	if (!user) return failure(401, 'unauthenticated');

	if (!(await logAccess(locals.createAdminClient(), user.id, 'export_data'))) {
		return failure(502, 'log_unavailable');
	}

	const read = (table: string) => locals.supabase.from(table).select('*');
	const [profile, consents, answers, requests, accessLog] = await Promise.all([
		read('profiles'),
		read('consent_logs'),
		read('survey_answers'),
		read('conversation_requests'),
		read('access_logs')
	]);
	if ([profile, consents, answers, requests, accessLog].some((r) => r.error)) {
		return failure(502, 'storage_unavailable');
	}

	const body = {
		exportedAt: new Date().toISOString(),
		email: user.email ?? '',
		profile: profile.data,
		consents: consents.data,
		answers: answers.data,
		conversationRequests: requests.data,
		accessLog: accessLog.data
	};
	return new Response(JSON.stringify(body, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': 'attachment; filename="i-miei-dati.json"',
			'Cache-Control': 'private, no-store'
		}
	});
}
