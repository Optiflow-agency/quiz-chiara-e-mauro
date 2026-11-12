import { redirect, type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { isAdmin, isAdminRequest } from '$lib/server/admin';
import { smtpMailer } from '$lib/server/mail';

function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`Missing environment variable ${name}`);
	return value;
}

/** One Supabase client per request, bound to that request's cookies (never shared). */
export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(
		required('PUBLIC_SUPABASE_URL', env.PUBLIC_SUPABASE_URL),
		required('PUBLIC_SUPABASE_PUBLISHABLE_KEY', env.PUBLIC_SUPABASE_PUBLISHABLE_KEY),
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookies) =>
					cookies.forEach(({ name, value, options }) =>
						// The browser never reads the session; keep it out of reach of scripts.
						event.cookies.set(name, value, { ...options, path: '/', httpOnly: true })
					)
			}
		}
	);

	event.locals.supabase = supabase;
	// Validated with the auth server (unlike the cookie contents, which can be forged).
	event.locals.getUser = async () => (await supabase.auth.getUser()).data.user;

	event.locals.createAdminClient = () =>
		createClient(
			required('PUBLIC_SUPABASE_URL', env.PUBLIC_SUPABASE_URL),
			required('SUPABASE_SECRET_KEY', privateEnv.SUPABASE_SECRET_KEY),
			{ auth: { persistSession: false, autoRefreshToken: false } }
		);

	event.locals.createMailer = () => smtpMailer(privateEnv);

	// The whole admin area (pages, data, endpoints) fails closed here, not route by route.
	if (isAdminRequest(event.route.id, event.url.pathname)) {
		if (!(await isAdmin(event.locals.createAdminClient(), await event.locals.getUser()))) {
			redirect(303, '/profilo');
		}
	}

	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	return response;
};

/** Added to every response; the CSP itself (with nonces) is in vite.config.ts. */
const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};
