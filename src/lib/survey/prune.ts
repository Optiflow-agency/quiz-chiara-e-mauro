import type { Answers, FieldValue } from './answers';
import type { Catalogue, CatalogueOption } from './catalogue';
import { evaluate, visibleOptions } from './conditions';

/** The answer without the options that are hidden; the same value when none is, `undefined` when nothing remains. */
function withoutHiddenOptions(
	options: CatalogueOption[],
	held: FieldValue,
	answers: Answers
): FieldValue | undefined {
	const shown = new Set(visibleOptions(options, answers).map((o) => o.value));
	const hidden = (v: string) => options.some((o) => o.value === v) && !shown.has(v);
	if (!Array.isArray(held)) return hidden(held) ? undefined : held;
	const kept = held.filter((v) => !hidden(v));
	if (kept.length === held.length) return held;
	return kept.length > 0 ? kept : undefined;
}

/**
 * Drops answers to sheets, fields and options that are no longer shown (e.g. after the respondent
 * changed an earlier answer), so hidden data is never kept or shared. Mutates `answers`.
 */
export function pruneHidden(catalogue: Catalogue, answers: Answers): void {
	// Removing one answer can hide another sheet, so repeat until nothing changes.
	let changed = true;
	while (changed) {
		changed = false;
		for (const sheet of catalogue.sheets) {
			const values = answers[sheet.id];
			if (!values) continue;
			if (!evaluate(sheet.display_when, answers)) {
				delete answers[sheet.id];
				changed = true;
				continue;
			}
			for (const field of sheet.fields) {
				if (field.id in values && !evaluate(field.display_when, answers)) {
					delete values[field.id];
					changed = true;
				} else if (field.id in values && 'options' in field) {
					const kept = withoutHiddenOptions(field.options, values[field.id], answers);
					if (kept !== values[field.id]) {
						if (kept === undefined) delete values[field.id];
						else values[field.id] = kept;
						changed = true;
					}
				}
			}
			if (Object.keys(values).length === 0) delete answers[sheet.id];
		}
	}
}
