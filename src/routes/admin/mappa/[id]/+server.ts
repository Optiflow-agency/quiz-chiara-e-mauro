import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { logAccess } from '$lib/server/access-log';
import { isUuid, eligibleRespondent } from '$lib/server/admin';
import { isDraftSwitchOn } from '$lib/server/map-access';
import { renderRespondentMap } from '$lib/server/respondent-map';

/**
 * One respondent's map as a PDF, shown inline for printing. Only admins get here (hooks guard);
 * eligibility (verified, consenting, with answers) is re-checked, so for anyone else even a
 * typed URL is a 404, and the access is logged before anything is read: a failed log
 * write means no map.
 */
export async function GET({ params, locals }) {
	if (!isUuid(params.id)) error(404);
	const admin = locals.createAdminClient();

	const respondent = await eligibleRespondent(admin, params.id);
	if (respondent === undefined) error(502);
	if (respondent === null) error(404);
	if (!(await logAccess(admin, params.id, 'print_pdf', 'consultant'))) error(502);

	const pdf = await renderRespondentMap(admin, params.id, {
		draft: isDraftSwitchOn(env.MAP_DRAFT),
		now: new Date()
	});
	if (!pdf) error(502);

	return new Response(pdf as Uint8Array<ArrayBuffer>, {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': 'inline; filename="mappa.pdf"',
			'Cache-Control': 'private, no-store'
		}
	});
}
