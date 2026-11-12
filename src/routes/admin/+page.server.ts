import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	PAGE_SIZE,
	isUuid,
	listRespondents,
	pageFromUrl,
	requestedOnlyFromUrl,
	searchFromUrl
} from '$lib/server/admin';
import { emailRespondentMap } from '$lib/server/map-mail';
import { isDraftSwitchOn } from '$lib/server/map-access';
import { renderRespondentMap } from '$lib/server/respondent-map';

/** The admin guard in hooks.server.ts has already let only admins through. */
export async function load({ locals, url }) {
	const search = searchFromUrl(url);
	const page = pageFromUrl(url);
	const requestedOnly = requestedOnlyFromUrl(url);
	const result = await listRespondents(locals.createAdminClient(), { search, page, requestedOnly });
	return {
		search,
		requestedOnly,
		page,
		pages: result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1,
		total: result?.total ?? 0,
		respondents: result?.rows ?? null
	};
}

export const actions = {
	/** Emails one respondent their map, at their verified address (the form carries only the id). */
	sendMap: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!isUuid(id)) return fail(400, { id: null, error: 'missing' as const });
		const mailer = locals.createMailer();
		if (!mailer) return fail(503, { id, error: 'unavailable' as const });

		const admin = locals.createAdminClient();
		const outcome = await emailRespondentMap(
			{
				admin,
				mailer,
				render: (respondent) =>
					renderRespondentMap(admin, respondent, {
						draft: isDraftSwitchOn(env.MAP_DRAFT),
						now: new Date()
					})
			},
			id
		);
		if (outcome !== 'sent') return fail(outcome === 'missing' ? 404 : 502, { id, error: outcome });
		return { id, sent: true as const };
	}
};
