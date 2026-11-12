import { fail, redirect } from '@sveltejs/kit';
import { logAccess } from '$lib/server/access-log';
import { isAdmin } from '$lib/server/admin';
import { recordConsent } from '$lib/server/consent';
import {
	CODE_STEP_COOKIE,
	FINISHED_COOKIE,
	captchaFromForm,
	codeFromForm,
	codeStepCookieOptions,
	emailFromCookie,
	emailFromForm,
	finishedCookieOptions,
	sendCode,
	verifyCode
} from '$lib/server/sign-in';

export async function load({ locals, cookies }) {
	const user = await locals.getUser();
	// A code was sent from this browser in the last few minutes: stay on the code step.
	const codeEmail = emailFromCookie(cookies.get(CODE_STEP_COOKIE));

	if (!user || user.is_anonymous) {
		return {
			state: user ? ('verify' as const) : ('login' as const),
			// The address given at the gate, to prefill the verification.
			prefill: emailFromCookie(user?.user_metadata?.pending_email) ?? '',
			codeEmail,
			email: '',
			consents: {} as Record<string, boolean>,
			answerCount: 0,
			admin: false
		};
	}

	// RLS limits all reads to the signed-in respondent's own rows.
	const [consents, answers, admin] = await Promise.all([
		locals.supabase.from('consents').select('purpose, granted'),
		locals.supabase.from('survey_answers').select('sheet_id', { count: 'exact', head: true }),
		isAdmin(locals.createAdminClient(), user)
	]);

	return {
		state: 'verified' as const,
		prefill: '',
		codeEmail: null,
		email: user.email ?? '',
		consents: Object.fromEntries((consents.data ?? []).map((c) => [c.purpose, c.granted === true])),
		answerCount: answers.count ?? 0,
		admin
	};
}

export const actions = {
	/**
	 * Emails a 6-digit code (also used to resend). The outcome is identical whether or not the
	 * address is registered. The code step is remembered in a cookie so a reload keeps it.
	 */
	sendCode: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const email = emailFromForm(form);
		if (!email) return fail(400, { error: 'email' as const });
		const captcha = captchaFromForm(form);
		if (!captcha) return fail(400, { error: 'captcha' as const });
		const user = await locals.getUser();
		if (user && !user.is_anonymous) return fail(400, { error: 'send' as const });

		const error = await sendCode(locals.supabase, user, email, captcha);
		if (error) return fail(error === 'rate' ? 429 : 502, { error });

		cookies.set(CODE_STEP_COOKIE, email, codeStepCookieOptions);
		return { sent: true as const };
	},

	/** Checks the code. A respondent who gave answers anonymously goes back to the survey, or to the thank-you page once it is finished. */
	verify: async ({ request, locals, cookies }) => {
		const email = emailFromCookie(cookies.get(CODE_STEP_COOKIE));
		if (!email) return fail(400, { error: 'expired' as const });
		const code = codeFromForm(await request.formData());
		if (!code) return fail(400, { error: 'code' as const });

		const before = await locals.getUser();
		const error = await verifyCode(locals.supabase, locals.createAdminClient, before, email, code);
		if (error) return fail(error === 'rate' ? 429 : error === 'send' ? 502 : 400, { error });

		cookies.delete(CODE_STEP_COOKIE, { path: codeStepCookieOptions.path });
		const user = await locals.getUser();
		if (user) await logAccess(locals.createAdminClient(), user.id, 'login'); // best effort
		if (!before?.is_anonymous) redirect(303, '/profilo');
		// Back to the survey, unless they came here from the thank-you page.
		const finished = cookies.get(FINISHED_COOKIE) === '1';
		cookies.delete(FINISHED_COOKIE, { path: finishedCookieOptions.path });
		redirect(303, finished ? '/grazie' : '/');
	},

	/** "Use a different email": back to the first step. */
	changeEmail: async ({ cookies }) => {
		cookies.delete(CODE_STEP_COOKIE, { path: codeStepCookieOptions.path });
		return { reset: true as const };
	},

	logout: async ({ locals }) => {
		const user = await locals.getUser();
		if (user) await logAccess(locals.createAdminClient(), user.id, 'logout'); // best effort
		await locals.supabase.auth.signOut();
		redirect(303, '/');
	},

	/**
	 * Withdraws the processing consent and erases the saved answers. The consent entry goes first:
	 * the database then refuses further saves. Idempotent, so a failed erase can be retried.
	 */
	withdraw: async ({ locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { error: 'withdraw' as const });
		const admin = locals.createAdminClient();

		const { data: current, error: readFailure } = await locals.supabase
			.from('consents')
			.select('granted')
			.eq('purpose', 'processing')
			.maybeSingle();
		if (readFailure) return fail(500, { error: 'withdraw' as const });
		if (current?.granted === true) {
			if (!(await recordConsent(locals.supabase, user.id, false))) {
				return fail(500, { error: 'withdraw' as const });
			}
			if (!(await logAccess(admin, user.id, 'change_consent'))) {
				return fail(500, { error: 'withdraw' as const });
			}
		}

		const { error: deleteFailure } = await admin
			.from('survey_answers')
			.delete()
			.eq('user_id', user.id);
		if (deleteFailure) return fail(500, { error: 'withdraw' as const });
		if (!(await logAccess(admin, user.id, 'delete_answers'))) {
			return fail(500, { error: 'withdraw' as const });
		}
		return { done: 'withdraw' as const };
	},

	/** Deletes the account (never an admin's); the audit entry is written first and a failed write aborts. */
	deleteAccount: async ({ locals }) => {
		const user = await locals.getUser();
		if (!user) return fail(401, { error: 'deleteAccount' as const });
		const admin = locals.createAdminClient();
		// Staff accounts stay while listed as admins (the database refuses too).
		if (await isAdmin(admin, user)) return fail(403, { error: 'deleteAccount' as const });

		if (!(await logAccess(admin, user.id, 'delete_account'))) {
			return fail(500, { error: 'deleteAccount' as const });
		}
		const { error } = await admin.auth.admin.deleteUser(user.id);
		if (error) return fail(500, { error: 'deleteAccount' as const });

		await locals.supabase.auth.signOut({ scope: 'local' }); // the session is already gone
		redirect(303, '/');
	}
};
