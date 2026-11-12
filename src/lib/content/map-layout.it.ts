import type { Clarity, Lens } from '../map/types.ts';
import { messages } from './messages.it.ts';

/**
 * Page chrome of the printed map (docs/map-spec.md, section 7 and 8). The sentences of the map
 * itself arrive already composed in the `MapDocument`; only the fixed frame lives here.
 */
export const mapLayoutIt = {
	brand: messages.brand,
	/** Page titles; `accent` is the one italic emphasis word, as in the survey's headings. */
	pages: {
		summary: { before: 'La tua ', accent: 'mappa', after: ' in breve' },
		areas: { before: 'Le sei ', accent: 'aree', after: '' },
		next: { before: 'Per andare ', accent: 'avanti', after: '' }
	},
	/** Top-bar position label, after the date. */
	position: 'pagina {n}/4',
	lead: 'Costruita sulle risposte che hai dato, come invito ad informarsi e discutere con professionisti',
	sections: {
		start: 'Il punto di partenza',
		numbers: 'I numeri della mappa',
		areas: 'Le sei aree',
		highlights: 'I punti da approfondire',
		goals: 'Le cose che contano per voi',
		forReader: 'Per chi legge la mappa con te',
		legend: 'Le cinque prospettive',
		questions: 'Le domande da portare con te',
		gather: 'Cosa può servire avere sotto mano'
	},
	/** Labels of the respondent's own words on page 1. */
	reader: { improve: "L'aspetto da migliorare", question: 'La domanda' },
	/** The map of page 1 and its cross-references on pages 2 and 3. */
	atlas: {
		you: 'Voi',
		goals: 'Obiettivi',
		noGoals: 'Non indicati',
		notApplicable: 'Non ti riguarda',
		caption:
			'Ogni linea unisce due parti che una stessa lettura mette in relazione. Più linee di livello intorno a un’area, più il suo quadro è completo. I cerchi numerati sono i punti da approfondire.',
		linked: 'Collegata a'
	},
	clarity: {
		chiara: 'Quadro completo',
		in_parte: 'Quadro parziale',
		da_ricostruire: 'Quadro da ricostruire',
		non_compilata: 'Non compilata'
	} satisfies Record<Clarity, string>,
	lenses: {
		chiarezza: 'Chiarezza',
		coerenza: 'Coerenza',
		strategia: 'Strategia',
		protezione: 'Protezione',
		trasmissione: 'Trasmissione'
	} satisfies Record<Lens, string>,
	lensLegend: {
		chiarezza: 'quello che si sa e quello che non si sa',
		coerenza: 'se obiettivi, abitudini e risorse vanno nella stessa direzione',
		strategia: 'come le parti stanno insieme',
		protezione: 'cosa succede se qualcosa va storto',
		trasmissione: 'chi viene dopo'
	} satisfies Record<Lens, string>,
	footer: {
		disclaimer: 'Mappa orientativa. Non è una consulenza e non contiene raccomandazioni.',
		/** Written to the PDF's metadata (Subject), never printed on the page. */
		versions: 'schede {catalogue} · regole {rules}'
	},
	months: [
		'gennaio',
		'febbraio',
		'marzo',
		'aprile',
		'maggio',
		'giugno',
		'luglio',
		'agosto',
		'settembre',
		'ottobre',
		'novembre',
		'dicembre'
	],
	draftMark: 'BOZZA',
	fallback: {
		noHighlights: 'Dalle risposte date non emergono punti da mettere in evidenza.',
		incomplete: 'La mappa è incompleta: alcune aree non sono state compilate.',
		/** Value of a number of page 1 that cannot be computed. */
		notComputable: 'non calcolabile',
		/** Paragraph of an area where no sentence can be computed. */
		emptyArea: 'Per questa area le risposte date non bastano a calcolare nulla.'
	},
	closing: {
		invitation:
			'Questa mappa è un punto di partenza. Se vuoi leggerla insieme a un consulente, puoi contattarci qui: decidi tu se e quando.',
		/** Printed under the invitation and encoded in its QR code. */
		contactUrl: 'https://mauroschileo.it/contatti/',
		/** Who the invitation comes from, as the consultant's own site states it. */
		credentials:
			'Mauro Schileo, consulente finanziario. Iscritto all’Albo unico dei Consulenti Finanziari, sezione dei consulenti finanziari abilitati all’offerta fuori sede con delibera Consob n. 56 del 7/9/09. Albo tenuto dall’OCF – Organismo di vigilanza e tenuta dell’Albo unico dei Consulenti Finanziari.'
	}
};

export type MapLayoutCopy = typeof mapLayoutIt;
