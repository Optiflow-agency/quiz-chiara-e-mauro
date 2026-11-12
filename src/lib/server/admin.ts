import type { SupabaseClient, User } from '@supabase/supabase-js';
import { logAccess } from './access-log.ts';
import { emailPattern, maxEmailLength } from './consent.ts';

/**
 * Admin area. Admins are the addresses listed in `public.admins`; they sign in like respondents
 * (emailed code at /profilo). Every check reads the table, so a removed address loses access at
 * its next request. All functions take their clients.
 */

const maxSearchLength = 100;
/** Respondents per page of the admin list. */
export const PAGE_SIZE = 25;
const maxPage = 10_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Whether a path belongs to the guarded admin area (data and endpoints included). */
export const isAdminPath = (pathname: string): boolean =>
	pathname === '/admin' || pathname.startsWith('/admin/');

/**
 * Whether a request reaches the admin area. The router matches the *decoded* path, so the raw
 * pathname alone misses e.g. `/%61dmin`; the matched route id (null when nothing matches) is what
 * will actually run. Both are checked, so either one alone guards the area.
 */
export const isAdminRequest = (routeId: string | null, pathname: string): boolean =>
	isAdminPath(routeId ?? '') || isAdminPath(pathname);

/** A trimmed, lower-case address, or null when it is not a plausible email. */
export function normalizeEmail(raw: string): string | null {
	const email = raw.trim().toLowerCase();
	return email.length > 0 && email.length <= maxEmailLength && emailPattern.test(email)
		? email
		: null;
}

/** Whether `user` is a verified account whose address is listed. `admin` is the service role. */
export async function isAdmin(admin: SupabaseClient, user: User | null): Promise<boolean> {
	if (!user || user.is_anonymous || !user.email || !user.email_confirmed_at) return false;
	const { data, error } = await admin
		.from('admins')
		.select('email')
		.eq('email', user.email.toLowerCase())
		.maybeSingle();
	return !error && data !== null;
}

/** The search box text, bounded; empty when absent. */
export function searchFromUrl(url: URL): string {
	return (url.searchParams.get('q') ?? '').trim().slice(0, maxSearchLength);
}

/** The 1-based page number from `?pagina=`; 1 for anything missing or malformed. */
export function pageFromUrl(url: URL): number {
	const raw = url.searchParams.get('pagina') ?? '';
	const page = /^\d{1,5}$/.test(raw) ? Number(raw) : 1;
	return Math.min(Math.max(page, 1), maxPage);
}

/** Whether `?colloquio=1` asks for only those who requested a conversation. */
export const requestedOnlyFromUrl = (url: URL): boolean =>
	url.searchParams.get('colloquio') === '1';

export const isUuid = (value: string): boolean => uuidPattern.test(value);

export interface Respondent {
	id: string;
	email: string;
	answered: number;
	last_answer: string | null;
	requested_at: string | null;
}

export interface RespondentPage {
	rows: Respondent[];
	/** Matches across all pages. */
	total: number;
}

/**
 * One page of the verified respondents who consented to processing (`admin_respondents` in the
 * database): all of them, or the fuzzy matches of
 * `search`, best first. `requestedOnly` keeps those who asked for a conversation; `respondent`
 * narrows to one. Null when the read failed.
 */
export async function listRespondents(
	admin: SupabaseClient,
	{
		search = '',
		page = 1,
		requestedOnly = false,
		respondent = null
	}: { search?: string; page?: number; requestedOnly?: boolean; respondent?: string | null }
): Promise<RespondentPage | null> {
	const { data, error } = await admin.rpc('admin_respondents', {
		search,
		respondent,
		page_size: PAGE_SIZE,
		page_offset: (page - 1) * PAGE_SIZE,
		requested_only: requestedOnly
	});
	if (error) return null;
	const rows = data as (Respondent & { total: number })[];
	return {
		rows: rows.map(({ id, email, answered, last_answer, requested_at }) => ({
			id,
			email,
			answered,
			last_answer,
			requested_at
		})),
		total: rows.length > 0 ? Number(rows[0].total) : 0
	};
}

/**
 * The respondent, when an admin may open, print or email their map: verified, consenting to
 * processing, and with answers. `null` when not; `undefined` when the read failed.
 */
export async function eligibleRespondent(
	admin: SupabaseClient,
	id: string
): Promise<Respondent | null | undefined> {
	const found = await listRespondents(admin, { respondent: id });
	if (!found) return undefined;
	const respondent = found.rows[0];
	return respondent && respondent.answered > 0 ? respondent : null;
}

/** Deploy-time sync: `public.admins` becomes exactly `emails`. Throws on failure so the deploy stops. */
export async function syncAdmins(admin: SupabaseClient, emails: string[]): Promise<void> {
	if (emails.length === 0) throw new Error('refusing to remove every admin');
	const listed = await admin.from('admins').upsert(emails.map((email) => ({ email })));
	if (listed.error) throw new Error(`admins upsert: ${listed.error.message}`);
	const removed = await admin
		.from('admins')
		.delete()
		.not('email', 'in', `(${emails.map((e) => `"${e}"`).join(',')})`);
	if (removed.error) throw new Error(`admins cleanup: ${removed.error.message}`);
}

export type AdminRemoval = 'not_admin' | 'demoted' | 'purged' | 'would_demote' | 'would_purge';

/**
 * Developer-side removal of admins (scripts/remove-admins.ts). Only listed addresses are touched:
 * each leaves `public.admins` and becomes a normal account. With `purge`, the account is then
 * deleted exactly like a respondent's own deletion (answers and profile go, consent and access
 * logs keep their rows unlinked), after a `system` entry in the access log. `dryRun` reports what
 * would happen and changes nothing. Throws on any failure; addresses already done stay done.
 */
export async function removeAdmins(
	admin: SupabaseClient,
	emails: string[],
	{ purge = false, dryRun = false }: { purge?: boolean; dryRun?: boolean } = {}
): Promise<Record<string, AdminRemoval>> {
	const listed = await admin.from('admins').select('email').in('email', emails);
	if (listed.error) throw new Error(`admins read: ${listed.error.message}`);
	const admins = new Set((listed.data ?? []).map((row) => row.email as string));

	// The account, if the admin ever signed in (profiles mirrors verified addresses).
	const accounts = new Map<string, string>();
	if (purge && admins.size > 0) {
		const found = await admin
			.from('profiles')
			.select('id, email')
			.in('email', [...admins]);
		if (found.error) throw new Error(`profiles read: ${found.error.message}`);
		for (const row of found.data ?? []) accounts.set(row.email as string, row.id as string);
	}

	const outcome: Record<string, AdminRemoval> = {};
	for (const email of emails) {
		if (!admins.has(email)) {
			outcome[email] = 'not_admin';
			continue;
		}
		const id = accounts.get(email);
		if (dryRun) {
			outcome[email] = id ? 'would_purge' : 'would_demote';
			continue;
		}
		// First: the database refuses to delete a listed admin's account.
		const removed = await admin.from('admins').delete().eq('email', email);
		if (removed.error) throw new Error(`${email}: admins delete: ${removed.error.message}`);
		if (!id) {
			outcome[email] = 'demoted';
			continue;
		}
		if (!(await logAccess(admin, id, 'delete_account', 'system'))) {
			throw new Error(`${email}: access log unavailable, account kept (no longer an admin)`);
		}
		const deleted = await admin.auth.admin.deleteUser(id);
		if (deleted.error) {
			throw new Error(`${email}: account delete: ${deleted.error.message} (no longer an admin)`);
		}
		outcome[email] = 'purged';
	}
	return outcome;
}

/** Parses an address list (comma or whitespace separated), as in `ADMIN_EMAILS`. Null when blank; throws on a bad address. */
export function parseAdminEmails(raw: string | undefined): string[] | null {
	const parts = (raw ?? '').split(/[\s,]+/).filter(Boolean);
	if (parts.length === 0) return null;
	const emails = parts.map((part) => {
		const email = normalizeEmail(part);
		if (!email) throw new Error(`not an email address: ${part}`);
		return email;
	});
	return [...new Set(emails)];
}
