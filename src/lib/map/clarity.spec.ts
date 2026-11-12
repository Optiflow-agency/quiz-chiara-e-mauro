import { describe, expect, it } from 'vitest';
import { assessAreas, stateOf } from './clarity.ts';
import { buildFacts } from './facts.ts';
import type { MapAnswers } from './facts.ts';
import { catalogue } from '../content/sheets.it.ts';

const BAND_SETS = catalogue.amountBandSets;

const areas = (answers: MapAnswers) => assessAreas(buildFacts(answers, BAND_SETS));

describe('stateOf', () => {
	it('is not filled when every signal is absent', () => {
		expect(stateOf([], false)).toBe('non_compilata');
		expect(stateOf(['absent', 'absent'], false)).toBe('non_compilata');
		// Answers that are not signals (Q18 "cannot" alone) make the picture partial, not blank.
		expect(stateOf(['absent', 'absent'], true)).toBe('in_parte');
	});
	it('is clear when no signal is unclear', () => {
		expect(stateOf(['clear', 'absent', 'clear'], true)).toBe('chiara');
	});
	it('needs rebuilding when at least half of the present signals are unclear', () => {
		expect(stateOf(['unclear', 'clear', 'absent'], true)).toBe('da_ricostruire');
		expect(stateOf(['unclear'], true)).toBe('da_ricostruire');
	});
	it('is partly clear otherwise', () => {
		expect(stateOf(['unclear', 'clear', 'clear'], true)).toBe('in_parte');
	});
});

describe('assessAreas', () => {
	it('flags withheld answers and counts the unclear signals', () => {
		const a = areas({
			S05: { income_self: '1500_2500' },
			S06: { fixed: 'withheld', tracking: 'sometimes' }
		});
		expect(a.IO.withheld).toBe(true);
		expect(a.IO.clarity).toBe('da_ricostruire');
		expect(a.RI.withheld).toBe(false);
	});

	it('reads the income from either wording of Q11', () => {
		expect(areas({ S05: { income_household: '1500_2500' } }).IO.clarity).toBe('chiara');
		expect(areas({ S05: { income_household: 'unknown' } }).IO.clarity).toBe('da_ricostruire');
	});

	it('treats a withheld answer as absent, not as unclear', () => {
		expect(areas({ S07: { liquidity: 'withheld', emergency: 'adequate' } }).RI.clarity).toBe(
			'chiara'
		);
	});

	it('marks "never assessed" as unclear', () => {
		expect(areas({ S07: { emergency: 'never_assessed' } }).RI.clarity).toBe('da_ricostruire');
	});

	it('counts "no debts" as clear for the debt area, and a missing amount as unclear', () => {
		expect(areas({ S08: { debt_types: ['none'] } }).DE.clarity).toBe('chiara');
		expect(areas({ S08: { debt_types: ['car'], instalments: 'unknown' } }).DE.clarity).toBe(
			'da_ricostruire'
		);
		expect(areas({ S08: { debt_types: ['car'], instalments: 'lt_1000' } }).DE.clarity).toBe(
			'chiara'
		);
	});

	it('reads the savings, wealth and investment signals', () => {
		expect(areas({ S12: { costs_returns: 'both', last_review: '1_3' } }).SA.clarity).toBe('chiara');
		expect(areas({ S12: { costs_returns: 'neither' } }).SA.clarity).toBe('da_ricostruire');
		expect(areas({ S12: { last_review: 'unknown' } }).SA.clarity).toBe('da_ricostruire');
		expect(areas({ S16: { wealth_estimate: 'unsure' } }).SA.clarity).toBe('chiara');
		expect(areas({ S16: { wealth_estimate: 'roughly' } }).SA.clarity).toBe('da_ricostruire');
		expect(areas({ S13: { purpose: 'yes' } }).SA.clarity).toBe('chiara');
		expect(areas({ S13: { purpose: 'vague' } }).SA.clarity).toBe('da_ricostruire');
		expect(areas({ S10: { holdings: ['none'] } }).SA.clarity).toBe('chiara');
	});

	it('reads the protection and succession signals', () => {
		expect(areas({ S14: { life_cover: 'none' } }).PR.clarity).toBe('chiara');
		expect(areas({ S14: { life_cover: 'unknown' } }).PR.clarity).toBe('da_ricostruire');
		expect(areas({ S16: { heirs: 'all' } }).PR.clarity).toBe('chiara');
		expect(areas({ S16: { heirs: 'some' } }).PR.clarity).toBe('da_ricostruire');
		expect(areas({ S15: { children_pension: 'neither' } }).PR.clarity).toBe('chiara');
		expect(areas({ S15: { children_pension: 'unknown' } }).PR.clarity).toBe('da_ricostruire');
		expect(areas({ S04: { owner_dependency: 'stops' } }).PR.clarity).toBe('chiara');
	});

	it('reads the self-employed signals of IO and RI', () => {
		expect(areas({ S04: { separate_accounts: 'yes' } }).IO.clarity).toBe('chiara');
		expect(areas({ S04: { separate_accounts: 'no' } }).IO.clarity).toBe('da_ricostruire');
		expect(areas({ S04: { tax_reserve: 'struggle' } }).RI.clarity).toBe('chiara');
	});

	it('reads the pension signals', () => {
		expect(
			areas({ S15: { tfr: 'company', pension_fund: 'no', pension_sim: 'knows' } }).PE.clarity
		).toBe('chiara');
		expect(areas({ S15: { tfr: 'unknown' } }).PE.clarity).toBe('da_ricostruire');
		expect(areas({ S15: { pension_fund: 'unsure_type' } }).PE.clarity).toBe('da_ricostruire');
		expect(areas({ S15: { pension_sim: 'forgot' } }).PE.clarity).toBe('da_ricostruire');
	});

	it('retires the pension area for a retired person', () => {
		const a = areas({ S03: { work: 'retired' } });
		expect(a.PE).toMatchObject({ clarity: 'non_compilata', notApplicable: true });
		expect(areas({ S03: { work: 'self_employed' } }).PE.notApplicable).toBe(false);
	});

	it('is not filled for areas never reached', () => {
		expect(areas({}).SA.clarity).toBe('non_compilata');
	});
});
