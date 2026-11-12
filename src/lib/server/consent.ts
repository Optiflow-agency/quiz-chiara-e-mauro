import type { SupabaseClient } from '@supabase/supabase-js';

/** Version of the privacy-policy / consent wording shown at the gate (see consent_logs). */
export const POLICY_VERSION = '2026-11-11';

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const maxEmailLength = 254;

/**
 * Appends a processing-consent decision to the log. `supabase` must hold the respondent's session
 * (RLS). The one consent covers preparing the map and sharing it with the event's consultants: it
 * is the service itself, so the gate asks for it as a required term.
 */
export async function recordConsent(
	supabase: SupabaseClient,
	userId: string,
	granted = true
): Promise<boolean> {
	const { error } = await supabase
		.from('consent_logs')
		.insert({ user_id: userId, purpose: 'processing', granted, policy_version: POLICY_VERSION });
	return !error;
}

/** Whether the signed-in respondent has granted processing. RLS limits the view to their own rows. */
export async function hasConsent(supabase: SupabaseClient): Promise<boolean> {
	const { data } = await supabase
		.from('consents')
		.select('granted')
		.eq('purpose', 'processing')
		.maybeSingle();
	return data?.granted === true;
}
