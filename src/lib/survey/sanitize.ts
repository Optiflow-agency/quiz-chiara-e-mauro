import { setValue, type AnswerPatch, type Answers, type FieldValue, type Values } from './answers';
import type { Catalogue, CatalogueField, Escape } from './catalogue';
import { pruneHidden } from './prune';

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

/** Whether `value` is something the catalogue allows for `field`: its type, options, escapes and limits. */
function isValid(catalogue: Catalogue, field: CatalogueField, value: unknown): value is FieldValue {
	switch (field.type) {
		case 'textarea':
			return typeof value === 'string' && value.length > 0 && value.length <= field.max_length;
		case 'band': {
			const bands = catalogue.amountBandSets[field.band_set] ?? [];
			return (
				typeof value === 'string' &&
				(value === 'unknown' || value === 'withheld' || bands.some((b) => b.value === value))
			);
		}
		case 'single':
			return typeof value === 'string' && isChoice(field, value);
		case 'multi': {
			if (!Array.isArray(value) || value.length === 0 || new Set(value).size !== value.length)
				return false;
			if (!value.every((v) => typeof v === 'string' && isChoice(field, v))) return false;
			if (value.length > (field.max_choices ?? field.options.length)) return false;
			// An escape or an exclusive option stands alone.
			const alone = (v: string) =>
				field.escapes?.includes(v as Escape) ||
				field.options.some((o) => o.value === v && o.exclusive);
			return value.length === 1 || !value.some(alone);
		}
	}
}

function isChoice(field: CatalogueField & { type: 'single' | 'multi' }, value: string): boolean {
	return (
		field.options.some((o) => o.value === value) ||
		field.escapes?.includes(value as Escape) === true
	);
}

/**
 * Validates one sheet's values against the catalogue: fields the catalogue does not have are
 * dropped, an invalid value rejects the sheet (null).
 */
function sanitizeSheet(catalogue: Catalogue, sheetId: string, values: unknown): Values | null {
	if (!isRecord(values)) return null;
	const fields = catalogue.sheets.find((s) => s.id === sheetId)?.fields ?? [];
	const kept: Answers = {};
	for (const [fieldId, value] of Object.entries(values)) {
		const field = fields.find((f) => f.id === fieldId);
		if (!field) continue;
		if (!isValid(catalogue, field, value)) return null;
		setValue(kept, sheetId, fieldId, value);
	}
	return kept[sheetId] ?? {};
}

/**
 * Turns untrusted input (storage) into answers the catalogue knows about.
 * Sheets and fields it no longer has are dropped; an invalid value rejects everything (null).
 */
export function sanitizeAnswers(catalogue: Catalogue, input: unknown): Answers | null {
	if (!isRecord(input)) return null;
	const answers: Answers = {};
	for (const [sheetId, values] of Object.entries(input)) {
		const kept = sanitizeSheet(catalogue, sheetId, values);
		if (!kept) return null;
		if (Object.keys(kept).length > 0) answers[sheetId] = kept;
	}
	pruneHidden(catalogue, answers);
	return answers;
}

/**
 * Same for a patch of sheets (request body). Unknown sheets are ignored; a sheet whose
 * fields are all unknown or empty becomes a deletion. Hidden-field pruning is the sender's job,
 * as it needs the other sheets; it shows up here as a deletion or a smaller sheet.
 */
export function sanitizePatch(catalogue: Catalogue, input: unknown): AnswerPatch | null {
	if (!isRecord(input)) return null;
	const patch: AnswerPatch = {};
	for (const [sheetId, values] of Object.entries(input)) {
		if (!catalogue.sheets.some((s) => s.id === sheetId)) continue;
		if (values === null) {
			patch[sheetId] = null;
			continue;
		}
		const kept = sanitizeSheet(catalogue, sheetId, values);
		if (!kept) return null;
		patch[sheetId] = Object.keys(kept).length > 0 ? kept : null;
	}
	return patch;
}
