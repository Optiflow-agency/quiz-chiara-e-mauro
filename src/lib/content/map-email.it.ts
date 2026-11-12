/**
 * The email that carries a respondent's map (PDF attached), sent by event staff from /admin.
 * Markup mirrors the code emails in supabase/templates/: table layout, inline styles, the dark
 * card. Copy stays descriptive: the map is a starting point for the consultant conversation,
 * never advice.
 */

import { mapLayoutIt } from './map-layout.it';

export const MAP_EMAIL_FILENAME = 'mappa-finanziaria.pdf';

const subject = 'La tua mappa finanziaria';

const lead =
	'In allegato trovi la tua mappa finanziaria, costruita a partire dalle risposte che hai dato nel questionario di Guadagnare non basta+.';

const pages: [label: string, title: string, detail: string][] = [
	[
		'Pagina 1',
		'La tua mappa in breve',
		'il punto di partenza, quattro numeri e lo stato delle sei aree.'
	],
	[
		'Pagine 2–3',
		'Le sei aree',
		'entrate e spese, riserva, debiti, risparmi, protezione e pensione.'
	],
	['Pagina 4', 'Per andare avanti', 'le domande da portare e cosa tenere a portata di mano.']
];

const nextStep =
	'La mappa descrive la tua situazione così come l’hai raccontata: è il punto di partenza per la conversazione con i professionisti dell’evento. Portala con te.';

const attachment = 'PDF, 4 pagine';
const contactLead = 'Se vuoi leggerla insieme a un consulente, puoi';
const contactLink = 'contattarci qui';
/** The same contact page the printed map links to. */
const contactUrl = mapLayoutIt.closing.contactUrl;
const disclaimer = 'Mappa orientativa. Non è una consulenza e non contiene raccomandazioni.';
const credentials = mapLayoutIt.closing.credentials;
const why =
	'Ricevi questa email perché hai compilato il questionario di Guadagnare non basta+ e lo staff dell’evento ti ha inviato la tua mappa.';

const display = `'Montserrat','Helvetica Neue',Arial,sans-serif`;
const body = `'Lato','Helvetica Neue',Arial,sans-serif`;

/** Subject, plain text and HTML of the map email. */
export function mapEmail(): { subject: string; text: string; html: string } {
	const text = [
		'La tua mappa finanziaria',
		'',
		lead,
		'',
		'Cosa trovi nella mappa:',
		...pages.map(([label, title, detail]) => `- ${label}, ${title}: ${detail}`),
		'',
		nextStep,
		'',
		`${contactLead} ${contactLink}: ${contactUrl}`,
		'',
		disclaimer,
		credentials,
		why
	].join('\n');

	const pageRows = pages
		.map(
			([label, title, detail], i) => `
                  <tr>
                    <td style="padding:${i === 0 ? '0' : '14px'} 0 0 0;font-family:${body};font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#a7bbd6;">${label}</td>
                  </tr>
                  <tr>
                    <td style="padding:2px 0 0 0;font-family:${body};font-size:15px;line-height:1.55;color:#dce6f5;"><strong style="color:#ffffff;">${title}</strong>: ${detail}</td>
                  </tr>`
		)
		.join('');

	const html = `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${subject}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,600;1,400;1,600&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin:0;padding:0;background-color:#071a33;">
    <!-- Inbox preview line. -->
    <div style="display:none;max-height:0;overflow:hidden;">${lead}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#071a33" style="background-color:#071a33;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#0b2545" style="width:100%;max-width:560px;background-color:#0b2545;border-radius:16px;">
            <tr>
              <td style="padding:40px 32px 8px 32px;font-family:${display};font-size:15px;font-weight:600;font-style:italic;letter-spacing:-0.02em;color:#ffffff;">
                Guadagnare non basta<span style="color:#6fa3ff;font-style:normal;">+</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0 32px;font-family:${display};font-size:34px;line-height:1.15;font-weight:600;letter-spacing:-0.02em;color:#ffffff;">
                La tua <span style="font-style:italic;color:#6fa3ff;">mappa</span> finanziaria
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;font-family:${body};font-size:17px;line-height:1.6;color:#dce6f5;">${lead}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <!-- The attachment, named so it is easy to find among the mail's parts. -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding:8px 14px;border:1px solid #2b4a75;border-radius:999px;font-family:${body};font-size:14px;line-height:1.3;color:#dce6f5;">
                      <strong style="color:#ffffff;">${MAP_EMAIL_FILENAME}</strong>&nbsp;&nbsp;<span style="color:#a7bbd6;">${attachment}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#071a33" style="background-color:#071a33;border-radius:12px;">
                  <tr>
                    <td style="padding:22px 24px 24px 24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="padding:0 0 14px 0;font-family:${display};font-size:17px;line-height:1.3;font-weight:600;color:#ffffff;">Cosa trovi nella mappa</td>
                        </tr>${pageRows}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0 32px;font-family:${body};font-size:17px;line-height:1.6;color:#dce6f5;">${nextStep}</td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;font-family:${body};font-size:15px;line-height:1.6;color:#dce6f5;">
                ${contactLead} <a href="${contactUrl}" style="color:#6fa3ff;font-weight:700;text-decoration:underline;">${contactLink}</a>.
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 0 32px;">
                <div style="height:1px;line-height:1px;font-size:1px;background-color:#1f3d66;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 40px 32px;font-family:${body};font-size:13px;line-height:1.6;color:#a7bbd6;">
                ${disclaimer}<br />${credentials}<br />${why}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

	return { subject, text, html };
}
