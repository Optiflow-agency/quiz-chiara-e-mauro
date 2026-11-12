/**
 * A sheet is answered or unanswered: unanswered fields have no entry at all.
 * A value is an option or band value, or the reserved `unknown` / `withheld`; a `multi` stores
 * an array of them (`['unknown']` for the escape).
 */
export type FieldValue = string | string[];
/** Field id -> value, for one sheet. */
export type Values = Record<string, FieldValue>;
/** Sheet id -> its values. */
export type Answers = Record<string, Values>;

/** Sheets to store (their values) or delete (null); sheets not listed are untouched. */
export type AnswerPatch = Record<string, Values | null>;

/** Returns `answers` with the patch applied: listed sheets replaced or (null) deleted. */
export function applyPatch(answers: Answers, patch: AnswerPatch): Answers {
	const result = { ...answers };
	for (const [id, values] of Object.entries(patch)) {
		if (values) result[id] = values;
		else delete result[id];
	}
	return result;
}

/** The sheets whose values differ between two sets of answers, as the patch turning `from` into `to`. */
export function diffAnswers(from: Answers, to: Answers): AnswerPatch {
	const patch: AnswerPatch = {};
	for (const id of new Set([...Object.keys(from), ...Object.keys(to)])) {
		if (JSON.stringify(from[id]) !== JSON.stringify(to[id])) patch[id] = to[id] ?? null;
	}
	return patch;
}

/** Stores or clears one value; an unanswered field leaves no trace, nor an empty sheet. */
export function setValue(
	answers: Answers,
	sheetId: string,
	fieldId: string,
	value: FieldValue | undefined
): void {
	if (value === undefined || (Array.isArray(value) && value.length === 0)) {
		const values = answers[sheetId];
		if (!values) return;
		delete values[fieldId];
		if (Object.keys(values).length === 0) delete answers[sheetId];
		return;
	}
	(answers[sheetId] ??= {})[fieldId] = value;
}
