import nodemailer from 'nodemailer';

export interface MailMessage {
	to: string;
	subject: string;
	text: string;
	html: string;
	attachments?: { filename: string; content: Uint8Array; contentType: string }[];
}

/** Sends one message; false when the server refused it. */
export interface Mailer {
	send(message: MailMessage): Promise<boolean>;
}

/** The SMTP settings: the same account the hosted Supabase project sends its auth emails with. */
export interface SmtpEnv {
	SMTP_HOST?: string;
	SMTP_PORT?: string;
	SMTP_USER?: string;
	SMTP_PASS?: string;
	/** Sender, e.g. `Guadagnare non basta+ <mappa@example.com>`. */
	SMTP_FROM?: string;
}

/**
 * A mailer over SMTP, or null when host, port or sender are missing (callers fail closed).
 * User and password are optional, for the local Mailpit server. Port 465 uses TLS from the start;
 * other ports upgrade with STARTTLS when the server offers it.
 */
export function smtpMailer(env: SmtpEnv): Mailer | null {
	const port = Number(env.SMTP_PORT);
	if (!env.SMTP_HOST || !Number.isInteger(port) || port <= 0 || !env.SMTP_FROM) return null;
	const transport = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		secure: port === 465,
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined
	});
	const from = env.SMTP_FROM;
	return {
		async send({ to, attachments, ...message }) {
			try {
				await transport.sendMail({
					...message,
					// One address, never parsed as an address list (no display names or groups).
					to: { name: '', address: to },
					from,
					attachments: attachments?.map((a) => ({ ...a, content: Buffer.from(a.content) }))
				});
				return true;
			} catch {
				return false;
			}
		}
	};
}
