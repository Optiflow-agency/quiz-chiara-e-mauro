import { fail } from '@sveltejs/kit';
import { catalogue } from '$lib/content/sheets.it';
import { sanitizeAnswers } from '$lib/survey/sanitize';
import { forClient } from '$lib/survey/catalogue';
import { hasConsent, recordConsent } from '$lib/server/consent';
import { captchaFromForm, emailFromForm, startAnonymousSession } from '$lib/server/sign-in';

export async function load({ locals }) {
	const user = await locals.getUser();

	const consented = user !== null && (await hasConsent(locals.supabase));

	// The stored answers let the respondent resume on another device; if they cannot be read the
	// survey still works from the device copy.
	let answers = {};
	if (consented) {
		const { data, error } = await locals.supabase.from('survey_answers').select('sheet_id, answer');
		if (!error) {
			const stored = Object.fromEntries((data ?? []).map((row) => [row.sheet_id, row.answer]));
			answers = sanitizeAnswers(catalogue, stored) ?? {};
		}
	}

	return {
		catalogue: forClient(catalogue),
		hasSession: user !== null,
		consented,
		answers
	};
}

export const actions = {
	/**
	 * The gate for a respondent without a session: records the consent and unlocks the survey
	 * straight away. No email is sent here; the address is verified later, from the profile page.
	 */
	signin: async ({ request, locals }) => {
		const form = await request.formData();
		const email = emailFromForm(form);
		if (!email) return fail(400, { error: 'email' as const });
		if (form.get('processing') !== 'on') {
			return fail(400, { error: 'processing' as const });
		}
		const captcha = captchaFromForm(form);
		if (!captcha) return fail(400, { error: 'captcha' as const });

		const error = await startAnonymousSession(locals.supabase, email, captcha);
		if (error) return fail(error === 'rate' ? 429 : 502, { error });
		return { recorded: true as const };
	},

	/** The gate for a respondent who already has a session (anonymous or verified). */
	consent: async ({ request, locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { error: 'send' as const });

		const form = await request.formData();
		if (form.get('processing') !== 'on') {
			return fail(400, { error: 'processing' as const });
		}
		if (!(await recordConsent(locals.supabase, user.id))) {
			return fail(500, { error: 'send' as const });
		}
		return { recorded: true as const };
	}
};
