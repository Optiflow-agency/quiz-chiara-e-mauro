import { describe, expect, it } from 'vitest';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
	captchaFromForm,
	codeFromForm,
	emailFromCookie,
	emailFromForm,
	sendCode,
	startAnonymousSession,
	verifyCode
} from './sign-in';

type AuthError = { status?: number; code?: string } | null;

/** Records every auth call; each method answers from `replies` (default: success). */
function fakeClient(replies: Record<string, unknown> = {}) {
	const calls: { method: string; args: unknown }[] = [];
	const answer =
		(method: string, fallback: unknown = { data: {}, error: null }) =>
		async (args?: unknown) => {
			calls.push({ method, args });
			return replies[method] ?? fallback;
		};
	const client = {
		auth: {
			signInAnonymously: answer('signInAnonymously', {
				data: { user: { id: 'anon1' } },
				error: null
			}),
			signInWithOtp: answer('signInWithOtp'),
			updateUser: answer('updateUser'),
			verifyOtp: answer('verifyOtp', { data: { user: { id: 'target1' } }, error: null }),
			signOut: answer('signOut')
		},
		from: () => ({
			insert: async (rows: unknown) => {
				calls.push({ method: 'consent', args: rows });
				return { error: replies.consent ?? null };
			}
		}),
		rpc: async (name: string, args: unknown) => {
			calls.push({ method: `rpc:${name}`, args });
			return { error: replies.rpc ?? null };
		}
	};
	return { client: client as unknown as SupabaseClient, calls };
}

const anonymous = { id: 'anon1', is_anonymous: true } as User;
const withPending = { ...anonymous, new_email: 'a@example.com' } as User;
const methods = (calls: { method: string }[]) => calls.map((c) => c.method);

describe('form parsing', () => {
	const form = (entries: Record<string, string>) => {
		const data = new FormData();
		for (const [key, value] of Object.entries(entries)) data.set(key, value);
		return data;
	};

	it('accepts exactly six digits, ignoring whitespace', () => {
		expect(codeFromForm(form({ code: '123456' }))).toBe('123456');
		expect(codeFromForm(form({ code: ' 123 456 ' }))).toBe('123456');
		for (const bad of [
			'12345',
			'1234567',
			'12345a',
			'',
			'１２３４５６',
			`1${' '.repeat(40)}23456`
		]) {
			expect(codeFromForm(form({ code: bad }))).toBeNull();
		}
		expect(codeFromForm(new FormData())).toBeNull();
	});

	it('bounds the email and the captcha token', () => {
		expect(emailFromForm(form({ email: ' a@example.com ' }))).toBe('a@example.com');
		expect(emailFromForm(form({ email: ' Gianni.Rossi@Example.com ' }))).toBe(
			'gianni.rossi@example.com'
		);
		expect(emailFromForm(form({ email: 'nope' }))).toBeNull();
		expect(emailFromForm(form({ email: `${'a'.repeat(250)}@example.com` }))).toBeNull();
		expect(captchaFromForm(form({ captcha: 'tok' }))).toBe('tok');
		expect(captchaFromForm(form({ captcha: '' }))).toBeNull();
		expect(captchaFromForm(form({ captcha: 'x'.repeat(5000) }))).toBeNull();
		expect(captchaFromForm(new FormData())).toBeNull();
	});

	it('reads the code-step cookie defensively', () => {
		expect(emailFromCookie('a@example.com')).toBe('a@example.com');
		expect(emailFromCookie('junk')).toBeNull();
		expect(emailFromCookie(undefined)).toBeNull();
	});
});

describe('startAnonymousSession', () => {
	it('signs in anonymously with the captcha and keeps the email as metadata, then records consent', async () => {
		const { client, calls } = fakeClient();
		expect(await startAnonymousSession(client, 'a@example.com', 'tok')).toBeNull();
		expect(calls[0]).toEqual({
			method: 'signInAnonymously',
			args: { options: { captchaToken: 'tok', data: { pending_email: 'a@example.com' } } }
		});
		expect(methods(calls)).toEqual(['signInAnonymously', 'consent']);
	});

	it('drops the new session when consent cannot be recorded', async () => {
		const { client, calls } = fakeClient({ consent: { message: 'boom' } });
		expect(await startAnonymousSession(client, 'a@example.com', 'tok')).toBe('send');
		expect(methods(calls)).toEqual(['signInAnonymously', 'consent', 'signOut']);
	});

	it('maps sign-in failures, rate limiting included, and records nothing', async () => {
		const failing = (error: AuthError) => fakeClient({ signInAnonymously: { data: {}, error } });
		const limited = failing({ status: 429 });
		expect(await startAnonymousSession(limited.client, 'a@example.com', 'tok')).toBe('rate');
		const broken = failing({ status: 400 });
		expect(await startAnonymousSession(broken.client, 'a@example.com', 'tok')).toBe('send');
		expect(methods(broken.calls)).toEqual(['signInAnonymously']);
	});
});

describe('sendCode', () => {
	it('signs in by code without a session, creating the account if needed', async () => {
		const { client, calls } = fakeClient();
		expect(await sendCode(client, null, 'a@example.com', 'tok')).toBeNull();
		expect(calls).toEqual([
			{
				method: 'signInWithOtp',
				args: { email: 'a@example.com', options: { captchaToken: 'tok' } }
			}
		]);
	});

	it('attaches a new address to an anonymous respondent', async () => {
		const { client, calls } = fakeClient();
		expect(await sendCode(client, anonymous, 'a@example.com', 'tok')).toBeNull();
		expect(calls).toEqual([{ method: 'updateUser', args: { email: 'a@example.com' } }]);
	});

	it('falls back to a sign-in code, never creating an account, when the address is registered', async () => {
		const { client, calls } = fakeClient({
			updateUser: { data: {}, error: { status: 422, code: 'email_exists' } }
		});
		expect(await sendCode(client, anonymous, 'a@example.com', 'tok')).toBeNull();
		expect(methods(calls)).toEqual(['updateUser', 'signInWithOtp']);
		expect(calls[1].args).toEqual({
			email: 'a@example.com',
			options: { shouldCreateUser: false, captchaToken: 'tok' }
		});
	});

	it('reports other failures without trying the fallback, and maps 429', async () => {
		const other = fakeClient({ updateUser: { data: {}, error: { status: 500 } } });
		expect(await sendCode(other.client, anonymous, 'a@example.com', 'tok')).toBe('send');
		expect(methods(other.calls)).toEqual(['updateUser']);

		const limited = fakeClient({ updateUser: { data: {}, error: { status: 429 } } });
		expect(await sendCode(limited.client, anonymous, 'a@example.com', 'tok')).toBe('rate');

		const fallbackLimited = fakeClient({
			updateUser: { data: {}, error: { status: 422, code: 'email_exists' } },
			signInWithOtp: { data: {}, error: { status: 429 } }
		});
		expect(await sendCode(fallbackLimited.client, anonymous, 'a@example.com', 'tok')).toBe('rate');
	});
});

describe('verifyCode', () => {
	const unused = () => {
		throw new Error('admin client not expected');
	};

	it('confirms an attached address in place and clears the pending email', async () => {
		const { client, calls } = fakeClient();
		expect(await verifyCode(client, unused, withPending, 'a@example.com', '123456')).toBeNull();
		expect(calls[0]).toEqual({
			method: 'verifyOtp',
			args: { email: 'a@example.com', token: '123456', type: 'email_change' }
		});
		expect(calls[1]).toEqual({ method: 'updateUser', args: { data: { pending_email: null } } });
	});

	it('signs an anonymous respondent into the existing account, then merges into it', async () => {
		const respondent = fakeClient();
		const admin = fakeClient();
		const outcome = await verifyCode(
			respondent.client,
			() => admin.client,
			anonymous,
			'a@example.com',
			'123456'
		);
		expect(outcome).toBeNull();
		expect(respondent.calls[0].args).toEqual({
			email: 'a@example.com',
			token: '123456',
			type: 'email'
		});
		expect(admin.calls).toEqual([
			{ method: 'rpc:merge_anonymous_respondent', args: { anon: 'anon1', target: 'target1' } }
		]);
	});

	it('signs in plainly, without merging, when there is no anonymous session', async () => {
		const { client } = fakeClient();
		expect(await verifyCode(client, unused, null, 'a@example.com', '123456')).toBeNull();
	});

	it('confirms the attached address even when the cookie kept other letter case', async () => {
		const { client, calls } = fakeClient();
		const typed = { ...anonymous, new_email: 'a@example.com' } as User;
		expect(await verifyCode(client, unused, typed, 'A@Example.com', '123456')).toBeNull();
		expect(calls[0].args).toMatchObject({ type: 'email_change' });
	});

	it('uses the sign-in path when the pending address is a different one', async () => {
		const respondent = fakeClient();
		const admin = fakeClient();
		await verifyCode(respondent.client, () => admin.client, withPending, 'b@example.com', '123456');
		expect(respondent.calls[0].args).toMatchObject({ type: 'email' });
		expect(methods(admin.calls)).toEqual(['rpc:merge_anonymous_respondent']);
	});

	it('gives one generic answer for a wrong or expired code, and never merges', async () => {
		const respondent = fakeClient({
			verifyOtp: { data: { user: null }, error: { status: 403, code: 'otp_expired' } }
		});
		expect(await verifyCode(respondent.client, unused, anonymous, 'a@example.com', '000000')).toBe(
			'invalid'
		);
		const attached = fakeClient({
			verifyOtp: { data: { user: null }, error: { status: 400, code: 'otp_disabled' } }
		});
		expect(await verifyCode(attached.client, unused, withPending, 'a@example.com', '000000')).toBe(
			'invalid'
		);
		expect(methods(attached.calls)).toEqual(['verifyOtp']);
	});

	it('maps rate limiting and server trouble', async () => {
		const limited = fakeClient({ verifyOtp: { data: {}, error: { status: 429 } } });
		expect(await verifyCode(limited.client, unused, null, 'a@example.com', '123456')).toBe('rate');
		const down = fakeClient({ verifyOtp: { data: {}, error: { status: 500 } } });
		expect(await verifyCode(down.client, unused, null, 'a@example.com', '123456')).toBe('send');
	});

	it('fails closed when the merge fails: reports it and drops the session', async () => {
		const respondent = fakeClient();
		const admin = fakeClient({ rpc: { message: 'boom' } });
		const outcome = await verifyCode(
			respondent.client,
			() => admin.client,
			anonymous,
			'a@example.com',
			'123456'
		);
		expect(outcome).toBe('send');
		expect(methods(respondent.calls)).toEqual(['verifyOtp', 'signOut']);
	});
});
