import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { sanitizeAnswers, sanitizePatch } from './sanitize';
import type { Catalogue } from './catalogue';
import { reconcile } from './reconcile';

describe('sanitizeAnswers', () => {
	it('keeps known answers and drops unknown sheets and fields', () => {
		expect(
			sanitizeAnswers(catalogue, { S01: { age_band: '26_35', nope: 'x' }, gone: { a: 'x' } })
		).toEqual({ S01: { age_band: '26_35' } });
	});

	it('accepts a value of each field type', () => {
		const answers = {
			S01: { age_band: '26_35', marital: 'married' },
			S05: { income_household: '2500_5000' },
			S08: { debt_types: ['car', 'overdraft'], instalments: 'unknown' },
			S10: { investments: 'yes' },
			S12: { last_review: 'unknown' },
			S17: { goals: ['buy_home', 'freedom'] },
			S18: { question: 'Come si legge la mappa?' }
		};
		expect(sanitizeAnswers(catalogue, answers)).toEqual(answers);
	});

	it('reads an investments answer saved while that question allowed one choice', () => {
		// S12 is shown only to who invests.
		const invests = { S10: { investments: 'yes' } };
		expect(sanitizeAnswers(catalogue, { ...invests, S12: { chosen_by: 'bank' } })).toEqual({
			...invests,
			S12: { chosen_by: ['bank'] }
		});
		expect(sanitizePatch(catalogue, { S12: { chosen_by: 'self' } })).toEqual({
			S12: { chosen_by: ['self'] }
		});
		const both = { ...invests, S12: { chosen_by: ['bank', 'advisor'] } };
		expect(sanitizeAnswers(catalogue, both)).toEqual(both);
	});

	it('rejects anything that is not an object of objects of valid values', () => {
		expect(sanitizeAnswers(catalogue, null)).toBeNull();
		expect(sanitizeAnswers(catalogue, [])).toBeNull();
		expect(sanitizeAnswers(catalogue, { S01: 'x' })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S01: { age_band: { a: 1 } } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S01: { age_band: 30 } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S01: { age_band: ['26_35'] } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: 'car' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: [] } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: ['car', 'car'] } })).toBeNull();
	});

	it('rejects an option the field does not have', () => {
		expect(sanitizeAnswers(catalogue, { S01: { age_band: '12_17' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: ['car', 'gold'] } })).toBeNull();
	});

	it('rejects an escape on a field that does not offer it', () => {
		expect(sanitizeAnswers(catalogue, { S01: { age_band: 'unknown' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S06: { tracking: 'unknown' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S11: { pac: 'unknown' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: ['unknown'] } })).toBeNull();
	});

	it('rejects a band outside the field set', () => {
		expect(sanitizeAnswers(catalogue, { S06: { fixed: 'lt_1500' } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S06: { fixed: '1000' } })).toBeNull();
	});

	it('rejects more choices than max_choices', () => {
		const limited: Catalogue = {
			amountBandSets: {},
			sheets: [
				{
					id: 'X',
					section: '',
					prompt: '',
					display_when: 'always',
					help: '',
					fields: [
						{
							id: 'f',
							label: '',
							display_when: 'always',
							type: 'multi',
							max_choices: 2,
							options: ['a', 'b', 'c'].map((value) => ({ value, label: value }))
						}
					]
				}
			]
		};
		expect(sanitizeAnswers(limited, { X: { f: ['a', 'b'] } })).not.toBeNull();
		expect(sanitizeAnswers(limited, { X: { f: ['a', 'b', 'c'] } })).toBeNull();
	});

	it('rejects an exclusive option mixed with other choices', () => {
		expect(sanitizeAnswers(catalogue, { S08: { debt_types: ['none', 'car'] } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S10: { holdings: ['none', 'etf'] } })).toBeNull();
	});

	it('rejects text beyond max_length, and empty text', () => {
		expect(sanitizeAnswers(catalogue, { S18: { question: 'x'.repeat(300) } })).not.toBeNull();
		expect(sanitizeAnswers(catalogue, { S18: { question: 'x'.repeat(301) } })).toBeNull();
		expect(sanitizeAnswers(catalogue, { S18: { question: '' } })).toBeNull();
	});
});

describe('sanitizePatch', () => {
	it('keeps known sheets, turns empty ones into deletions and ignores unknown ones', () => {
		expect(
			sanitizePatch(catalogue, {
				S01: { age_band: '26_35', nope: 'x' },
				S02: null,
				S03: { nope: 'x' },
				gone: { a: 'x' }
			})
		).toEqual({ S01: { age_band: '26_35' }, S02: null, S03: null });
	});

	it('rejects malformed sheets and invalid values', () => {
		expect(sanitizePatch(catalogue, [])).toBeNull();
		expect(sanitizePatch(catalogue, { S01: 'x' })).toBeNull();
		expect(sanitizePatch(catalogue, { S01: { age_band: { a: 1 } } })).toBeNull();
		expect(sanitizePatch(catalogue, { S01: { age_band: '12_17' } })).toBeNull();
		expect(sanitizePatch(catalogue, { S06: { fixed: 'lt_1500' } })).toBeNull();
	});
});

describe('options with their own display_when', () => {
	it('drops an answer naming an option that is hidden', () => {
		const oneChild = { S01: { children: 'one' } };
		expect(
			sanitizeAnswers(catalogue, { S01: { children: 'one', children_independent: 'some' } })
		).toEqual(oneChild);
		const twoChildren = { S01: { children: 'two', children_independent: 'some' } };
		expect(sanitizeAnswers(catalogue, twoChildren)).toEqual(twoChildren);
	});

	it('drops just the hidden values of a multi, and the whole answer when none remains', () => {
		expect(
			sanitizeAnswers(catalogue, {
				S01: { children: 'no' },
				S17: { goals: ['children', 'freedom'] }
			})
		).toEqual({ S01: { children: 'no' }, S17: { goals: ['freedom'] } });
		expect(
			sanitizeAnswers(catalogue, { S01: { children: 'no' }, S17: { goals: ['children'] } })
		).toEqual({ S01: { children: 'no' } });
	});

	it('drops them on the server when the trigger changes', () => {
		const stored = {
			S01: { children: 'two', children_independent: 'some' },
			S17: { goals: ['children', 'freedom'] }
		};
		const patch = reconcile(catalogue, stored, { S01: { children: 'no' } });
		expect(patch).toEqual({
			S01: { children: 'no' },
			S17: { goals: ['freedom'] }
		});
	});
});
