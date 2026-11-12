import type { Catalogue, CatalogueSheet } from './catalogue';
import type { Answers, FieldValue } from './answers';

/**
 * `display_when` rules, a tiny language: `always`, or comparisons joined by AND / OR
 * (AND binds tighter).
 *   S06.tracking == no   S03.work in [professional,entrepreneur,self_employed]
 *   S08.debt_types includes [mortgage,car]   S01.marital missing
 * A comparison against an unanswered field is false, so a follow-up never appears by default;
 * the one exception is `missing` (no operand), which holds exactly when the field is unanswered.
 */
type Op = '==' | '!=' | 'in' | 'includes' | 'missing';

type Condition =
	| { kind: 'always' }
	| { kind: 'any'; of: Condition[] }
	| { kind: 'all'; of: Condition[] }
	| { kind: 'test'; sheet: string; field: string; op: Op; operand: string[] };

const TEST = /^(\w+)\.(\w+)\s+(?:(==|!=|in|includes)\s+(.+)|(missing))$/;

export function parseCondition(source: string): Condition {
	const text = source.trim();
	if (text === 'always') return { kind: 'always' };
	const split = (input: string, word: string) => input.split(new RegExp(`\\s+${word}\\s+`));
	return {
		kind: 'any',
		of: split(text, 'OR').map((alt) => ({
			kind: 'all',
			of: split(alt, 'AND').map(parseClause)
		}))
	};
}

function parseClause(clause: string): Condition {
	const match = TEST.exec(clause.trim());
	if (!match) throw new Error(`Unparseable condition: "${clause}"`);
	const [, sheet, field, binaryOp, raw = '', missing] = match;
	const op = missing ?? binaryOp;
	const operand = raw.startsWith('[')
		? raw
				.slice(1, -1)
				.split(',')
				.map((v) => v.trim())
		: raw
			? [raw.trim()]
			: [];
	return { kind: 'test', sheet, field, op: op as Op, operand };
}

export function evaluate(condition: Condition | string, answers: Answers): boolean {
	const parsed = typeof condition === 'string' ? parseCondition(condition) : condition;
	switch (parsed.kind) {
		case 'always':
			return true;
		case 'any':
			return parsed.of.some((c) => evaluate(c, answers));
		case 'all':
			return parsed.of.every((c) => evaluate(c, answers));
		case 'test':
			return compare(answers[parsed.sheet]?.[parsed.field], parsed.op, parsed.operand);
	}
}

function compare(value: FieldValue | undefined, op: Op, operand: string[]): boolean {
	if (op === 'missing') return value === undefined;
	if (value === undefined) return false;
	const held = Array.isArray(value) ? value : [value];
	switch (op) {
		case '==':
			return held.length === 1 && held[0] === operand[0];
		case '!=':
			return held.length === 1 && held[0] !== operand[0];
		case 'in':
			return held.length === 1 && operand.includes(held[0]);
		case 'includes':
			return operand.some((v) => held.includes(v));
	}
}

/** The options of a choice field the respondent currently sees. */
export function visibleOptions<T extends { display_when?: string }>(
	options: T[],
	answers: Answers
): T[] {
	return options.filter((o) => o.display_when === undefined || evaluate(o.display_when, answers));
}

/** The sheets the respondent currently sees. */
export function visibleSheets(catalogue: Catalogue, answers: Answers): CatalogueSheet[] {
	return catalogue.sheets.filter((sheet) => evaluate(sheet.display_when, answers));
}
