import { describe, expect, it } from 'vitest';
import { MAP_EMAIL_FILENAME } from '$lib/content/map-email.it';
import type { MailMessage } from './mail';
import { emailRespondentMap } from './map-mail';

const respondent = {
	id: 'r1',
	email: 'rosa@example.it',
	answered: 13,
	last_answer: null,
	requested_at: null,
	total: 1
};

/** Service-role fake: `admin_respondents` returns `rows`; access log writes succeed unless `logFails`. */
function fakeAdmin(rows: unknown[] | null, logFails = false) {
	const logged: unknown[] = [];
	return {
		logged,
		client: {
			rpc: async () => (rows ? { data: rows, error: null } : { data: null, error: { m: 'x' } }),
			from: () => ({
				insert: async (row: unknown) =>
					logFails ? { error: { m: 'x' } } : (logged.push(row), { error: null })
			})
		} as never
	};
}

function fakeMailer(ok = true) {
	const sent: MailMessage[] = [];
	return { sent, mailer: { send: async (m: MailMessage) => (sent.push(m), ok) } };
}

const pdf = new Uint8Array([37, 80, 68, 70]);
const render = async () => pdf;

describe('emailRespondentMap', () => {
	it('sends the map to the verified address and logs it as staff', async () => {
		const { client, logged } = fakeAdmin([respondent]);
		const { mailer, sent } = fakeMailer();
		expect(await emailRespondentMap({ admin: client, mailer, render }, 'r1')).toBe('sent');
		expect(logged).toEqual([{ user_id: 'r1', actor: 'consultant', action: 'email_map' }]);
		expect(sent).toHaveLength(1);
		expect(sent[0].to).toBe('rosa@example.it');
		expect(sent[0].attachments).toEqual([
			{ filename: MAP_EMAIL_FILENAME, content: pdf, contentType: 'application/pdf' }
		]);
		expect(sent[0].html).toContain('https://mauroschileo.it/contatti/');
	});

	it('sends nothing for an ineligible or answerless respondent', async () => {
		const { mailer, sent } = fakeMailer();
		for (const rows of [[], [{ ...respondent, answered: 0 }]]) {
			const { client } = fakeAdmin(rows);
			expect(await emailRespondentMap({ admin: client, mailer, render }, 'r1')).toBe('missing');
		}
		expect(sent).toHaveLength(0);
	});

	it('fails closed when the read or the access log fails', async () => {
		const { mailer, sent } = fakeMailer();
		for (const admin of [fakeAdmin(null), fakeAdmin([respondent], true)]) {
			expect(await emailRespondentMap({ admin: admin.client, mailer, render }, 'r1')).toBe('error');
		}
		expect(sent).toHaveLength(0);
	});

	it('reports a failed render or a refused send', async () => {
		const noPdf = async () => null;
		expect(
			await emailRespondentMap(
				{
					admin: fakeAdmin([respondent]).client,
					mailer: fakeMailer().mailer,
					render: noPdf
				},
				'r1'
			)
		).toBe('error');
		expect(
			await emailRespondentMap(
				{
					admin: fakeAdmin([respondent]).client,
					mailer: fakeMailer(false).mailer,
					render
				},
				'r1'
			)
		).toBe('error');
	});
});
