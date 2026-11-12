import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
	isAdmin,
	isAdminPath,
	isAdminRequest,
	eligibleRespondent,
	pageFromUrl,
	parseAdminEmails,
	removeAdmins,
	requestedOnlyFromUrl,
	searchFromUrl,
	syncAdmins
} from './admin';

/** A service-role fake whose `admins` table holds `listed`. */
const adminsTable = (listed: string[], error: unknown = null) => ({
	from: () => ({
		select: () => ({
			eq: (_column: string, email: string) => ({
				maybeSingle: async () => ({ data: listed.includes(email) ? { email } : null, error })
			})
		})
	})
});

const verified = (email: string) =>
	({ id: 'u1', email, is_anonymous: false, email_confirmed_at: '2026-10-01' }) as User;

describe('isAdminPath', () => {
	it('guards the area, its data and endpoints', () => {
		expect(isAdminPath('/admin')).toBe(true);
		expect(isAdminPath('/admin/__data.json')).toBe(true);
		expect(isAdminPath('/admin/mappa/x')).toBe(true);
		expect(isAdminPath('/administrator')).toBe(false);
		expect(isAdminPath('/profilo')).toBe(false);
	});
});

describe('isAdminRequest', () => {
	it('guards by the matched route, so an encoded path cannot slip past', () => {
		expect(isAdminRequest('/admin', '/%61dmin')).toBe(true);
		expect(isAdminRequest('/admin/mappa/[id]', '/%61dmin/mappa/x')).toBe(true);
		expect(isAdminRequest(null, '/admin')).toBe(true);
		expect(isAdminRequest('/profilo', '/profilo')).toBe(false);
		expect(isAdminRequest(null, '/%61dmin')).toBe(false);
	});
});

describe('isAdmin', () => {
	it('accepts a verified listed address, case-insensitively', async () => {
		expect(await isAdmin(adminsTable(['a@b.it']) as never, verified('A@b.it'))).toBe(true);
	});

	it('rejects unlisted, anonymous, unverified and missing users, and read failures', async () => {
		const table = adminsTable(['a@b.it']) as never;
		expect(await isAdmin(table, verified('c@d.it'))).toBe(false);
		expect(await isAdmin(table, { ...verified('a@b.it'), is_anonymous: true })).toBe(false);
		expect(await isAdmin(table, { ...verified('a@b.it'), email_confirmed_at: undefined })).toBe(
			false
		);
		expect(await isAdmin(table, null)).toBe(false);
		expect(await isAdmin(adminsTable(['a@b.it'], { m: 'x' }) as never, verified('a@b.it'))).toBe(
			false
		);
	});
});

describe('syncAdmins', () => {
	it('upserts the list and removes everyone else', async () => {
		const calls: unknown[] = [];
		const admin = {
			from: () => ({
				upsert: async (rows: unknown) => (calls.push(['upsert', rows]), { error: null }),
				delete: () => ({
					not: async (...args: unknown[]) => (calls.push(['delete', ...args]), { error: null })
				})
			})
		};
		await syncAdmins(admin as never, ['a@b.it', 'c@d.it']);
		expect(calls).toEqual([
			['upsert', [{ email: 'a@b.it' }, { email: 'c@d.it' }]],
			['delete', 'email', 'in', '("a@b.it","c@d.it")']
		]);
	});

	it('never empties the table', async () => {
		await expect(syncAdmins({} as never, [])).rejects.toThrow();
	});
});

describe('parseAdminEmails', () => {
	it('normalizes, dedupes and accepts commas or whitespace', () => {
		expect(parseAdminEmails(' A@b.it, c@d.it\na@b.it ')).toEqual(['a@b.it', 'c@d.it']);
	});

	it('treats unset or blank as "leave admins alone"', () => {
		expect(parseAdminEmails(undefined)).toBeNull();
		expect(parseAdminEmails(' , ')).toBeNull();
	});

	it('fails on anything that is not an address', () => {
		expect(() => parseAdminEmails('a@b.it, nope')).toThrow(/nope/);
	});
});

describe('searchFromUrl', () => {
	it('trims and bounds the query', () => {
		expect(searchFromUrl(new URL('http://x/admin?q=%20ros%20'))).toBe('ros');
		expect(searchFromUrl(new URL('http://x/admin'))).toBe('');
		expect(searchFromUrl(new URL(`http://x/admin?q=${'a'.repeat(500)}`))).toHaveLength(100);
	});
});

describe('pageFromUrl', () => {
	const page = (query: string) => pageFromUrl(new URL(`http://x/admin${query}`));

	it('reads a positive page number', () => {
		expect(page('?pagina=3')).toBe(3);
	});

	it('falls back to 1 for anything else, and caps huge numbers', () => {
		for (const query of [
			'',
			'?pagina=0',
			'?pagina=-2',
			'?pagina=2.5',
			'?pagina=abc',
			'?pagina=1e3'
		]) {
			expect(page(query)).toBe(1);
		}
		expect(page('?pagina=99999')).toBe(10_000);
	});
});

describe('requestedOnlyFromUrl', () => {
	it('is on only for colloquio=1', () => {
		const on = (query: string) => requestedOnlyFromUrl(new URL(`http://x/admin${query}`));
		expect(on('?colloquio=1')).toBe(true);
		expect(on('')).toBe(false);
		expect(on('?colloquio=true')).toBe(false);
	});
});

describe('eligibleRespondent', () => {
	const row = {
		id: 'r1',
		email: 'rosa@example.it',
		answered: 13,
		last_answer: null,
		requested_at: null,
		total: 1
	};
	const rpc = (rows: unknown[] | null) =>
		({
			rpc: async () => (rows ? { data: rows, error: null } : { data: null, error: { m: 'x' } })
		}) as never;

	it('returns a consenting respondent with answers', async () => {
		expect(await eligibleRespondent(rpc([row]), 'r1')).toMatchObject({ id: 'r1' });
	});

	it('refuses the answerless and the missing, and reports a failed read', async () => {
		for (const rows of [[], [{ ...row, answered: 0 }]]) {
			expect(await eligibleRespondent(rpc(rows), 'r1')).toBeNull();
		}
		expect(await eligibleRespondent(rpc(null), 'r1')).toBeUndefined();
	});
});

describe('removeAdmins', () => {
	/** Fake database: `admins` and `profiles` (email -> id); records every write in order. */
	function fakeDb(admins: string[], profiles: Record<string, string>, failLog = false) {
		const writes: string[] = [];
		const client = {
			from: (table: string) => ({
				select: () => ({
					in: async (_c: string, emails: string[]) => ({
						data:
							table === 'admins'
								? admins.filter((e) => emails.includes(e)).map((email) => ({ email }))
								: emails
										.filter((e) => profiles[e])
										.map((email) => ({ email, id: profiles[email] })),
						error: null
					})
				}),
				delete: () => ({
					eq: async (_c: string, email: string) => (writes.push(`unlist ${email}`), { error: null })
				}),
				insert: async (row: { user_id: string; actor: string; action: string }) =>
					failLog
						? { error: { message: 'x' } }
						: (writes.push(`log ${row.user_id} ${row.actor} ${row.action}`), { error: null })
			}),
			auth: {
				admin: {
					deleteUser: async (id: string) => (writes.push(`delete ${id}`), { error: null })
				}
			}
		};
		return { writes, client: client as never };
	}

	it('only unlists by default, and leaves non-admins alone', async () => {
		const { client, writes } = fakeDb(['a@x.it'], { 'a@x.it': 'u1', 'r@x.it': 'u9' });
		expect(await removeAdmins(client, ['a@x.it', 'r@x.it'])).toEqual({
			'a@x.it': 'demoted',
			'r@x.it': 'not_admin'
		});
		expect(writes).toEqual(['unlist a@x.it']);
	});

	it('purges: unlists first, logs as system, then deletes the account', async () => {
		const { client, writes } = fakeDb(['a@x.it', 'b@x.it'], { 'a@x.it': 'u1' });
		expect(await removeAdmins(client, ['a@x.it', 'b@x.it'], { purge: true })).toEqual({
			'a@x.it': 'purged',
			'b@x.it': 'demoted'
		});
		expect(writes).toEqual([
			'unlist a@x.it',
			'log u1 system delete_account',
			'delete u1',
			'unlist b@x.it'
		]);
	});

	it('changes nothing on a dry run', async () => {
		const { client, writes } = fakeDb(['a@x.it', 'b@x.it'], { 'a@x.it': 'u1' });
		expect(await removeAdmins(client, ['a@x.it', 'b@x.it'], { purge: true, dryRun: true })).toEqual(
			{ 'a@x.it': 'would_purge', 'b@x.it': 'would_demote' }
		);
		expect(writes).toEqual([]);
	});

	it('keeps the account when the access log cannot be written', async () => {
		const { client, writes } = fakeDb(['a@x.it'], { 'a@x.it': 'u1' }, true);
		await expect(removeAdmins(client, ['a@x.it'], { purge: true })).rejects.toThrow(/account kept/);
		expect(writes).toEqual(['unlist a@x.it']);
	});
});
