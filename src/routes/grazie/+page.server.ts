import { redirect } from '@sveltejs/kit';
import { FINISHED_COOKIE, finishedCookieOptions } from '$lib/server/sign-in';

export async function load({ locals, cookies }) {
	const user = await locals.getUser();
	if (!user) redirect(303, '/');
	// Respondents who have not verified an email yet do that first, then come back here.
	if (user.is_anonymous) {
		cookies.set(FINISHED_COOKIE, '1', finishedCookieOptions);
		redirect(303, '/profilo');
	}
}
