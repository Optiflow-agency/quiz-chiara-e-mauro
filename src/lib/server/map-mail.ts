import type { SupabaseClient } from '@supabase/supabase-js';
import { MAP_EMAIL_FILENAME, mapEmail } from '$lib/content/map-email.it';
import { logAccess } from './access-log';
import { eligibleRespondent } from './admin';
import type { Mailer } from './mail';

export type MapMailOutcome = 'sent' | 'missing' | 'error';

/**
 * Emails a respondent their map, at their verified address. Eligibility is re-checked and the
 * access logged before the map is rendered; a failed log write means nothing is sent.
 */
export async function emailRespondentMap(
	deps: {
		admin: SupabaseClient;
		mailer: Mailer;
		render: (id: string) => Promise<Uint8Array | null>;
	},
	id: string
): Promise<MapMailOutcome> {
	const respondent = await eligibleRespondent(deps.admin, id);
	if (respondent === undefined) return 'error';
	if (respondent === null) return 'missing';
	if (!(await logAccess(deps.admin, id, 'email_map', 'consultant'))) return 'error';

	const pdf = await deps.render(id);
	if (!pdf) return 'error';
	const sent = await deps.mailer.send({
		to: respondent.email,
		...mapEmail(),
		attachments: [{ filename: MAP_EMAIL_FILENAME, content: pdf, contentType: 'application/pdf' }]
	});
	return sent ? 'sent' : 'error';
}
