import { describe, expect, it } from 'vitest';
import { smtpMailer } from './mail';

describe('smtpMailer', () => {
	it('is null unless host, port and sender are set', () => {
		const full = { SMTP_HOST: 'smtp.example.it', SMTP_PORT: '587', SMTP_FROM: 'a <a@example.it>' };
		expect(smtpMailer(full)).not.toBeNull();
		expect(smtpMailer({ ...full, SMTP_HOST: '' })).toBeNull();
		expect(smtpMailer({ ...full, SMTP_PORT: 'abc' })).toBeNull();
		expect(smtpMailer({ ...full, SMTP_FROM: undefined })).toBeNull();
	});
});
