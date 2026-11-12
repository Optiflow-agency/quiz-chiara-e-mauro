import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import type { Answers } from './answers';
import { evaluate, parseCondition, visibleOptions, visibleSheets } from './conditions';
import { buildScreens } from './screens';

const answers: Answers = {
	S03: { work: 'employee' },
	S08: { debt_types: ['car', 'overdraft'] }
};

describe('evaluate', () => {
	it('always holds', () => expect(evaluate('always', answers)).toBe(true));

	it('compares single values', () => {
		expect(evaluate('S03.work == employee', answers)).toBe(true);
		expect(evaluate('S03.work != employee', answers)).toBe(false);
		expect(evaluate('S03.work in [employee,retired]', answers)).toBe(true);
		expect(evaluate('S03.work in [retired]', answers)).toBe(false);
	});

	it('matches multi answers with includes', () => {
		expect(evaluate('S08.debt_types includes [mortgage,car]', answers)).toBe(true);
		expect(evaluate('S08.debt_types includes [mortgage]', answers)).toBe(false);
		expect(evaluate('S08.debt_types includes [none]', { S08: { debt_types: ['none'] } })).toBe(
			true
		);
	});

	it('is false for unanswered fields, including with !=', () => {
		expect(evaluate('S99.x == yes', answers)).toBe(false);
		expect(evaluate('S99.x != yes', answers)).toBe(false);
		expect(evaluate('S99.x includes [yes]', answers)).toBe(false);
	});

	it('tests for a missing answer with `missing`, which takes no operand', () => {
		expect(evaluate('S01.marital missing', {})).toBe(true);
		expect(evaluate('S01.marital missing', { S01: { children: 'no' } })).toBe(true);
		expect(evaluate('S01.marital missing', { S01: { marital: 'single' } })).toBe(false);
		expect(evaluate('S01.marital == married OR S01.marital missing', {})).toBe(true);
		expect(
			evaluate('S01.marital == married OR S01.marital missing', { S01: { marital: 'single' } })
		).toBe(false);
	});

	it('lets AND bind tighter than OR', () => {
		const rule = 'S99.x == yes OR S03.work == employee AND S08.debt_types includes [car]';
		expect(evaluate(rule, answers)).toBe(true);
		expect(evaluate(rule, { S03: { work: 'retired' } })).toBe(false);
	});

	it('rejects nonsense', () => {
		expect(() => parseCondition('do something')).toThrow();
		expect(() => parseCondition('S03.work > 3')).toThrow();
	});
});

const ids = (a: Answers) => visibleSheets(catalogue, a).map((sheet) => sheet.id);
const BUSINESS = ['professional', 'entrepreneur', 'self_employed'];

/** Whether the field is on screen: its sheet is visible and its own rule holds. */
function shown(sheetId: string, fieldId: string, a: Answers): boolean {
	const sheet = catalogue.sheets.find((s) => s.id === sheetId)!;
	const field = sheet.fields.find((f) => f.id === fieldId)!;
	return evaluate(sheet.display_when, a) && evaluate(field.display_when, a);
}

function optionValues(sheetId: string, fieldId: string, a: Answers): string[] {
	const field = catalogue.sheets
		.find((s) => s.id === sheetId)!
		.fields.find((f) => f.id === fieldId)!;
	if (!('options' in field)) throw new Error('not a choice field');
	return visibleOptions(field.options, a).map((o) => o.value);
}

describe('visibleSheets', () => {
	it('shows the unconditional sheets before anything is answered', () => {
		expect(ids({})).toEqual(
			catalogue.sheets.filter((s) => s.display_when === 'always').map((s) => s.id)
		);
		expect(ids({})).not.toContain('S04');
		expect(ids({})).not.toContain('S12');
	});

	it('shows S12 only to who holds investments', () => {
		expect(ids({ S10: { investments: 'no' } })).not.toContain('S12');
		for (const investments of ['yes', 'mostly_account'])
			expect(ids({ S10: { investments } })).toContain('S12');
	});
});

describe('the self-employed track', () => {
	it('shows S04 only to professionals, entrepreneurs and the self-employed', () => {
		for (const work of ['employee', 'retired', 'other'])
			expect(ids({ S03: { work } })).not.toContain('S04');
		for (const work of BUSINESS) expect(ids({ S03: { work } })).toContain('S04');
	});

	it('puts S04 right after the gate, with no new section title', () => {
		const screens = buildScreens(catalogue, { S03: { work: 'self_employed' } });
		const kinds = screens.map((s) => s.id);
		const at = kinds.indexOf('S03.income_role');
		expect(kinds.slice(at, at + 3)).toEqual(['S03.income_role', 'gate', 'S04']);
		// After S04's questions comes the title of section B, not of a new section A.
		const after = screens.findLastIndex((s) => s.id.startsWith('S04.')) + 1;
		expect(screens[after].kind).toBe('section');
		expect(screens.filter((s) => s.kind === 'section').length).toBe(
			buildScreens(catalogue, {}).filter((s) => s.kind === 'section').length
		);
	});
});

describe('the approved questionnaire branches', () => {
	it('asks about the children only to who has them', () => {
		for (const [children, expected] of [
			['no', false],
			['one', true],
			['two', true],
			['three_plus', true]
		] as const) {
			const a = { S01: { children } };
			expect(shown('S01', 'children_independent', a), children).toBe(expected);
			expect(shown('S15', 'children_pension', a), children).toBe(expected);
			expect(optionValues('S17', 'goals', a).includes('children'), children).toBe(expected);
		}
		expect(shown('S01', 'children_independent', {})).toBe(false);
	});

	it('offers "some children independent" only with two or more children', () => {
		const some = (children: string) =>
			optionValues('S01', 'children_independent', { S01: { children } }).includes('some');
		expect(some('one')).toBe(false);
		expect(some('two')).toBe(true);
		expect(some('three_plus')).toBe(true);
	});

	it('asks about the TFR only to employees', () => {
		expect(shown('S15', 'tfr', { S03: { work: 'employee' } })).toBe(true);
		for (const work of [...BUSINESS, 'retired', 'other'])
			expect(shown('S15', 'tfr', { S03: { work } }), work).toBe(false);
	});

	it('skips the pension questions about the respondent once retired', () => {
		for (const field of ['pension_fund', 'pension_sim']) {
			expect(shown('S15', field, { S03: { work: 'retired' } }), field).toBe(false);
			expect(shown('S15', field, { S03: { work: 'employee' } }), field).toBe(true);
		}
	});

	it('asks for the monthly plan amount only with a plan', () => {
		expect(shown('S11', 'pac_amount', { S11: { pac: 'yes' } })).toBe(true);
		expect(shown('S11', 'pac_amount', { S11: { pac: 'no' } })).toBe(false);
		expect(shown('S11', 'pac_amount', {})).toBe(false);
	});

	it('asks for the instalments only with a commitment, and for the saving amount only when saving', () => {
		expect(shown('S08', 'instalments', { S08: { debt_types: ['none'] } })).toBe(false);
		expect(shown('S08', 'instalments', { S08: { debt_types: ['car', 'other'] } })).toBe(true);
		expect(shown('S09', 'saving_amount', { S09: { saving_habit: 'cannot' } })).toBe(false);
		expect(shown('S09', 'saving_amount', { S09: { saving_habit: 'occasional' } })).toBe(true);
	});

	it('selects the income wording by marital status, and asks anyway when Q2 is skipped', () => {
		const wording = (a: Answers) => [
			shown('S05', 'income_self', a),
			shown('S05', 'income_household', a)
		];
		for (const marital of ['single', 'separated', 'divorced', 'widowed'])
			expect(wording({ S01: { marital } }), marital).toEqual([true, false]);
		for (const marital of ['married', 'cohabiting', 'withheld'])
			expect(wording({ S01: { marital } }), marital).toEqual([false, true]);
		expect(wording({})).toEqual([false, true]);
	});

	it('asks for the reason behind the succession only when not done, without repeating "later"', () => {
		const reason = (succession: string) => ({
			shown: shown('S16', 'succession_reason', { S16: { succession } }),
			values: optionValues('S16', 'succession_reason', { S16: { succession } })
		});
		expect(reason('planned').shown).toBe(false);
		expect(reason('thought').shown).toBe(false);
		expect(reason('no').shown).toBe(true);
		expect(reason('no').values).toContain('future');
		expect(reason('later').shown).toBe(true);
		expect(reason('later').values).not.toContain('future');
	});
});
