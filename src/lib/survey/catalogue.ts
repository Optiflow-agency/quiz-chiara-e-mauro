/**
 * Sheet catalogue: the data shape of `$lib/content/sheets.it.json`.
 * A sheet groups several fields shown together; `display_when` is a rule expression
 * kept as source text (see conditions.ts).
 */
export interface CatalogueOption {
	value: string;
	label: string;
	/** Choosing it clears every other choice (and the other way round). */
	exclusive?: boolean;
	/** Same rules as a field's; omitted means always shown. A hidden option is not offered, and an answer naming it is dropped. */
	display_when?: string;
}

/** A range of euros; `hi: null` is an open top band. */
export interface BandOption {
	value: string;
	label: string;
	lo: number;
	hi: number | null;
}

/** Reserved answers a field may offer besides its options. Their labels live in messages.it.ts. */
export type Escape = 'unknown' | 'withheld';
export const ESCAPES: readonly Escape[] = ['unknown', 'withheld'];

interface FieldBase {
	id: string;
	label: string;
	display_when: string;
	note?: string;
}

export type CatalogueField =
	| (FieldBase & {
			type: 'single' | 'multi';
			options: CatalogueOption[];
			escapes?: Escape[];
			/** `multi` only: the most choices allowed. */
			max_choices?: number;
			/** Knowledge-check items only; never sent to the browser. */
			correct_value?: string;
	  })
	/** Always offers both escapes. */
	| (FieldBase & { type: 'band'; band_set: string })
	| (FieldBase & { type: 'textarea'; max_length: number });

export interface CatalogueSheet {
	id: string;
	section: string;
	prompt: string;
	display_when: string;
	fields: CatalogueField[];
	/** The line shown under the prompt. */
	help: string;
}

export interface Catalogue {
	amountBandSets: Record<string, BandOption[]>;
	sheets: CatalogueSheet[];
}

/** The catalogue as the browser may see it: without the answers to the knowledge checks. */
export function forClient(catalogue: Catalogue): Catalogue {
	const strip = (field: CatalogueField): CatalogueField =>
		'correct_value' in field ? { ...field, correct_value: undefined } : field;
	return {
		...catalogue,
		sheets: catalogue.sheets.map((sheet) => ({ ...sheet, fields: sheet.fields.map(strip) }))
	};
}
