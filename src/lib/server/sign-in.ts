import type { SupabaseClient, User } from '@supabase/supabase-js';
import { emailPattern, maxEmailLength, recordConsent } from './consent';

/**
 * Email-code sign-in. Every function takes the Supabase client(s) it needs, so the flows can be
 * tested with fakes. Outcomes are deliberately coarse: they never reveal whether an address is
 * already registered.
 */

/** Cookie remembering that a code was sent to an address, so the code step survives a reload. */
export const CODE_STEP_COOKIE = 'code_step';

/** Short-lived (the code's own lifetime), script-proof, and only sent to the profile page. */
export const codeStepCookieOptions = {
	path: '/profilo',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 10 * 60
} as const;

/**
 * Cookie set by the thank-you page for a respondent who finished but must verify first, so the
 * verification brings them back there instead of to the survey. Navigation only, nothing stored.
 */
export const FINISHED_COOKIE = 'survey_finished';

export const finishedCookieOptions = { ...codeStepCookieOptions, maxAge: 60 * 60 } as const;

const maxCaptchaLength = 2048;
const codePattern = /^\d{6}$/;

export type SendOutcome = 'rate' | 'send';
export type VerifyOutcome = 'invalid' | 'rate' | 'send';

/**
 * The trimmed, lowercased, validated email from a form, or null. Lowercased because Supabase
 * stores addresses lowercased: "Mario@…" typed on a phone must still match `new_email`.
 */
export function emailFromForm(form: FormData): string | null {
	const email = String(form.get('email') ?? '')
		.trim()
		.toLowerCase();
	return email.length > 0 && email.length <= maxEmailLength && emailPattern.test(email)
		? email
		: null;
}

/** The email kept in the code-step cookie; anything unexpected counts as "no code step". */
export function emailFromCookie(raw: string | undefined): string | null {
	const email = (raw ?? '').toLowerCase();
	return email.length > 0 && email.length <= maxEmailLength && emailPattern.test(email)
		? email
		: null;
}

/** The Turnstile token from a form; null when missing or implausibly large. */
export function captchaFromForm(form: FormData): string | null {
	const token = form.get('captcha');
	return typeof token === 'string' && token.length > 0 && token.length <= maxCaptchaLength
		? token
		: null;
}

/** The six digits from a form (spaces, as in "123 456", are dropped); null for anything else. */
export function codeFromForm(form: FormData): string | null {
	const code = String(form.get('code') ?? '')
		.slice(0, 32)
		.replace(/\s+/g, '');
	return codePattern.test(code) ? code : null;
}

const sendFailure = (error: { status?: number }): SendOutcome =>
	error.status === 429 ? 'rate' : 'send';

/**
 * Gate: signs the respondent in anonymously (so answers can be saved) and records their consent.
 * Fails closed: without a consent record the new session is dropped again. The email is kept
 * in the user metadata, to prefill the verification later. Returns null on success.
 */
export async function startAnonymousSession(
	supabase: SupabaseClient,
	email: string,
	captchaToken: string
): Promise<SendOutcome | null> {
	const { data, error } = await supabase.auth.signInAnonymously({
		options: { captchaToken, data: { pending_email: email } }
	});
	if (error || !data.user) return error ? sendFailure(error) : 'send';
	if (!(await recordConsent(supabase, data.user.id))) {
		await supabase.auth.signOut({ scope: 'local' });
		return 'send';
	}
	return null;
}

/**
 * Emails a 6-digit code to `email`. `user` is the current session's user, if any.
 * - No session: sign-in code (an unknown address gets a new account).
 * - Anonymous respondent: attaches the address with `updateUser`; if it is already registered,
 *   a sign-in code is sent instead (to be merged on verification). Both look the same to the caller.
 * Returns null when sent.
 */
export async function sendCode(
	supabase: SupabaseClient,
	user: User | null,
	email: string,
	captchaToken: string
): Promise<SendOutcome | null> {
	if (user?.is_anonymous) {
		const { error } = await supabase.auth.updateUser({ email });
		if (!error) return null;
		if (error.code !== 'email_exists') return sendFailure(error);
		const existing = await supabase.auth.signInWithOtp({
			email,
			options: { shouldCreateUser: false, captchaToken }
		});
		return existing.error ? sendFailure(existing.error) : null;
	}
	const { error } = await supabase.auth.signInWithOtp({ email, options: { captchaToken } });
	return error ? sendFailure(error) : null;
}

/**
 * Checks the code. For an anonymous respondent the path follows from the session alone:
 * - the address was attached with `updateUser` (`new_email`): confirm it; same user, now permanent.
 * - otherwise it belongs to an existing account: sign in as that account, then move the answers
 *   over and delete the anonymous user (`admin`, atomic in the database).
 * Returns null on success.
 */
export async function verifyCode(
	supabase: SupabaseClient,
	admin: () => SupabaseClient,
	user: User | null,
	email: string,
	code: string
): Promise<VerifyOutcome | null> {
	const fail = (error: { status?: number }): VerifyOutcome =>
		error.status === 429 ? 'rate' : error.status && error.status >= 500 ? 'send' : 'invalid';

	if (user?.is_anonymous && user.new_email?.toLowerCase() === email.toLowerCase()) {
		const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' });
		if (error) return fail(error);
		await supabase.auth.updateUser({ data: { pending_email: null } }); // best effort
		return null;
	}

	const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
	if (error || !data.user) return error ? fail(error) : 'invalid';
	if (user?.is_anonymous) {
		const merged = await admin().rpc('merge_anonymous_respondent', {
			anon: user.id,
			target: data.user.id
		});
		if (merged.error) {
			await supabase.auth.signOut({ scope: 'local' });
			return 'send';
		}
	}
	return null;
}
