import type { SupabaseClient } from '@supabase/supabase-js';

export type AccessAction =
	| 'login'
	| 'logout'
	| 'export_data'
	| 'change_consent'
	| 'delete_answers'
	| 'delete_account'
	| 'print_pdf'
	| 'email_map';

/**
 * Appends an entry to `access_logs`. `admin` must be the service-role client: respondents have no
 * write privilege on the table. `actor` is who touched the data: the respondent, event staff
 * (`consultant`), or a developer script (`system`). Returns false when the write failed, so callers can fail closed.
 */
export async function logAccess(
	admin: SupabaseClient,
	userId: string,
	action: AccessAction,
	actor: 'user' | 'consultant' | 'system' = 'user'
): Promise<boolean> {
	const { error } = await admin.from('access_logs').insert({ user_id: userId, actor, action });
	return !error;
}
