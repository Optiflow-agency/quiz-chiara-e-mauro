import { describe, expect, it } from 'vitest';
import { buildFacts, divide, isBusiness, negate, subtract } from './facts.ts';
import { catalogue } from '../content/sheets.it.ts';

const BAND_SETS = catalogue.amountBandSets;

const facts = (answers: Parameters<typeof buildFacts>[0]) => buildFacts(answers, BAND_SETS);

describe('answer states', () => {
	it('keeps known, unknown, withheld and missing apart for singles', () => {
		const f = facts({
			S06: { tracking: 'regular' },
			S07: { emergency: 'withheld' },
			S14: { life_cover: 'unknown' }
		});
		expect(f.tracking).toEqual({ status: 'known', value: 'regular' });
		expect(f.emergency).toEqual({ status: 'withheld' });
		expect(f.life_cover).toEqual({ status: 'unknown' });
		expect(f.heirs).toEqual({ status: 'missing' });
	});

	it('reads escapes of a multi from its array', () => {
		const f = facts({
			S10: { holdings: ['unknown'] },
			S08: { debt_types: ['car', 'mortgage'] }
		});
		expect(f.holdings).toEqual({ status: 'unknown' });
		expect(f.debt_types).toEqual({ status: 'known', value: ['car', 'mortgage'] });
		expect(f.goals).toEqual({ status: 'missing' });
	});

	it('reads bands as intervals, with Infinity for an open top, and keeps their escapes', () => {
		const f = facts({
			S05: { income_self: 'gt_25000' },
			S06: { fixed: 'unknown' },
			S07: { liquidity: 'withheld' }
		});
		expect(f.income).toEqual({ status: 'known', value: { lo: 25000, hi: Infinity } });
		expect(f.fixed).toEqual({ status: 'unknown' });
		expect(f.liquidity).toEqual({ status: 'withheld' });
		expect(f.saving_amount).toEqual({ status: 'missing' });
	});

	it('reads the income from whichever wording of Q11 was answered', () => {
		expect(facts({ S05: { income_household: '2500_5000' } }).income).toEqual({
			status: 'known',
			value: { lo: 2500, hi: 5000 }
		});
		expect(facts({ S05: { income_self: 'unknown' } }).income).toEqual({ status: 'unknown' });
	});

	it('fails closed on values it does not recognise, and trims free text', () => {
		const f = facts({
			S05: { income_self: 'a_lot' },
			S01: { children: '9' },
			S10: { holdings: [] },
			S18: { improve: '   ', question: '  Come faccio?  ' }
		});
		expect(f.income).toEqual({ status: 'missing' });
		expect(f.children).toBeNull();
		expect(f.holdings).toEqual({ status: 'missing' });
		expect(f.improve).toEqual({ status: 'missing' });
		expect(f.question).toEqual({ status: 'known', value: 'Come faccio?' });
	});

	it('reads the children and whether some still depend on the respondent', () => {
		expect(facts({ S01: { children: 'three_plus' } }).children).toBe(3);
		expect(facts({ S01: { children: 'no' } }).children).toBe(0);
		expect(facts({}).children).toBeNull();
		const dependent = (children_independent: string) =>
			facts({ S01: { children: 'two', children_independent } }).dependentChildren;
		expect(dependent('some')).toBe(true);
		expect(dependent('none')).toBe(true);
		expect(dependent('all')).toBe(false);
		expect(dependent('unknown')).toBe(false);
	});

	it('knows the self-employed track', () => {
		for (const work of ['professional', 'entrepreneur', 'self_employed']) {
			expect(isBusiness(facts({ S03: { work } }))).toBe(true);
		}
		expect(isBusiness(facts({ S03: { work: 'employee' } }))).toBe(false);
		expect(isBusiness(facts({}))).toBe(false);
	});
});

describe('interval arithmetic', () => {
	it('subtracts crosswise and negates', () => {
		expect(subtract({ lo: 1500, hi: 2000 }, { lo: 1600, hi: 2200 })).toEqual({ lo: -700, hi: 400 });
		expect(negate({ lo: -700, hi: 400 })).toEqual({ lo: -400, hi: 700 });
	});

	it('is not computable when a difference is open at both ends', () => {
		expect(subtract({ lo: 5000, hi: Infinity }, { lo: 3000, hi: Infinity })).toBeNull();
		expect(subtract({ lo: 5000, hi: Infinity }, { lo: 800, hi: 1200 })).toEqual({
			lo: 3800,
			hi: Infinity
		});
		expect(subtract({ lo: 2500, hi: 3500 }, { lo: 3000, hi: Infinity })).toEqual({
			lo: -Infinity,
			hi: 500
		});
	});

	it('divides crosswise and handles open ends and zero', () => {
		expect(divide({ lo: 25000, hi: 50000 }, { lo: 3000, hi: Infinity })).toEqual({
			lo: 0,
			hi: 50000 / 3000
		});
		expect(divide({ lo: 50000, hi: Infinity }, { lo: 800, hi: 1200 })).toEqual({
			lo: 50000 / 1200,
			hi: Infinity
		});
		expect(divide({ lo: 0, hi: 0 }, { lo: 800, hi: 1200 })).toEqual({ lo: 0, hi: 0 });
		expect(divide({ lo: 0, hi: 0 }, { lo: 0, hi: 800 })).toEqual({ lo: 0, hi: 0 });
		expect(divide({ lo: 1, hi: 2 }, { lo: 0, hi: 0 })).toBeNull();
		// Open at both ends says nothing.
		expect(divide({ lo: 0, hi: 1000 }, { lo: 0, hi: 800 })).toBeNull();
	});
});

describe('computed facts (spec section 4)', () => {
	// P3 Salvatore.
	const p3 = facts({
		S01: { children: 'two', children_independent: 'none' },
		S05: { income_self: '1500_2500' },
		S06: { fixed: '1500_2500' },
		S07: { liquidity: 'lt_10000' },
		S08: { debt_types: ['personal_loan', 'salary_loan', 'overdraft'], instalments: '1000_1500' }
	});

	it('adds instalments to fixed spending and takes them off the income', () => {
		expect(p3.outgoings).toEqual({ lo: 2500, hi: 4000 });
		// P3 has a salary loan, which the stated income may already leave out: at best, no
		// instalment comes off it.
		expect(p3.margin).toEqual({ lo: -2500, hi: 1000 });
		expect(p3.marginYear).toEqual({ lo: -30000, hi: 12000 });
	});

	it('raises the margin to the monthly saving of who saves every month', () => {
		const month = (saving_habit: string, saving_amount: string, fixed = '1500_2500') =>
			facts({
				S05: { income_self: '1500_2500' },
				S06: { fixed },
				S08: { debt_types: ['none'] },
				S09: { saving_habit, saving_amount }
			}).margin;
		// Bands alone: [−1.000, 1.000]. Saving 100-500 every month: at least 100 are left.
		expect(month('monthly', '100_500')).toEqual({ lo: 100, hi: 1000 });
		// Saving under 100: at least nothing is missing.
		expect(month('monthly', 'lt_100')).toEqual({ lo: 0, hi: 1000 });
		// Saving now and then says nothing about every month.
		expect(month('variable', '100_500')).toEqual({ lo: -1000, hi: 1000 });
		// The figures contradict each other: the plain margin stays, and IO-08 says so.
		expect(month('monthly', '1000_2000', '2500_5000')).toEqual({ lo: -3500, hi: 0 });
	});

	it('has no instalments when there are no debts, and none known when they are not given', () => {
		const none = facts({
			S05: { income_self: '1500_2500' },
			S06: { fixed: '800_1500' },
			S08: { debt_types: ['none'] }
		});
		expect(none.instalments).toEqual({ status: 'known', value: { lo: 0, hi: 0 } });
		expect(none.margin).toEqual({ lo: 0, hi: 1700 });
		const missing = facts({
			S05: { income_self: '1500_2500' },
			S06: { fixed: '800_1500' },
			S08: { debt_types: ['car'], instalments: 'unknown' }
		});
		expect(missing.margin).toBeNull();
		expect(facts({}).margin).toBeNull();
	});

	it('computes the weight of instalments and the yearly cost', () => {
		expect(p3.instalmentsYear).toEqual({ lo: 12000, hi: 18000 });
		expect(p3.instalmentShare?.lo).toBeCloseTo((1000 / 2500) * 100);
		expect(p3.instalmentShare?.hi).toBeCloseTo((1500 / 1500) * 100);
		expect(p3.debtCount).toBe(3);
	});

	it('computes three months of outgoings and what the liquidity does not cover', () => {
		expect(p3.threeMonths).toEqual({ lo: 7500, hi: 12000 });
		expect(p3.missingThree).toEqual({ lo: 7500 - 10000, hi: 12000 });
		expect(p3.coverMonths).toEqual({ lo: 0, hi: 4 });
	});

	it('computes the reference expense in weeks of income and as a share of the liquidity', () => {
		expect(p3.shockAmount).toBe(2000);
		expect(p3.shockWeeks?.lo).toBeCloseTo(((2000 / 2500) * 52) / 12);
		expect(p3.shockWeeks?.hi).toBeCloseTo(((2000 / 1500) * 52) / 12);
		const f = facts({ S05: { income_self: '2500_5000' }, S07: { liquidity: '10000_50000' } });
		expect(f.shockAmount).toBe(5000);
		expect(f.shockShare?.lo).toBeCloseTo((5000 / 50000) * 100);
		expect(f.shockShare?.hi).toBeCloseTo((5000 / 10000) * 100);
		expect(facts({ S05: { income_self: '10000_25000' } }).shockAmount).toBe(10000);
		expect(facts({ S05: { income_self: 'unknown' } }).shockAmount).toBe(2000);
	});

	it('computes the saving in a year, its share of income and the PAC share of the saving', () => {
		const f = facts({
			S05: { income_household: '5000_10000' },
			S09: { saving_habit: 'monthly', saving_amount: '1000_2000' },
			S11: { pac: 'yes', pac_amount: '250_500' }
		});
		expect(f.savingYear).toEqual({ lo: 12000, hi: 24000 });
		expect(f.savingShare?.lo).toBeCloseTo(10);
		expect(f.savingShare?.hi).toBeCloseTo(40);
		expect(f.pacShare?.lo).toBeCloseTo(12.5);
		expect(f.pacShare?.hi).toBeCloseTo(50);
		expect(f.pacYear).toEqual({ lo: 3000, hi: 6000 });
	});

	it('is not computable when an input is unknown, withheld or missing', () => {
		const f = facts({
			S05: { income_self: 'unknown' },
			S06: { fixed: '800_1500' },
			S07: { liquidity: 'withheld' },
			S08: { debt_types: ['none'] }
		});
		expect(f.margin).toBeNull();
		expect(f.coverMonths).toBeNull();
		expect(f.shockWeeks).toBeNull();
		expect(f.missingThree).toBeNull();
		expect(f.threeMonths).toEqual({ lo: 2400, hi: 4500 });
	});

	it('is not computable when the result is open at both ends', () => {
		const f = facts({
			S05: { income_self: 'lt_1500' },
			S06: { fixed: 'lt_800' },
			S07: { liquidity: 'lt_10000' },
			S08: { debt_types: ['none'] },
			S09: { saving_habit: 'monthly', saving_amount: 'lt_100' }
		});
		expect(f.instalmentShare).toEqual({ lo: 0, hi: 0 });
		expect(f.savingShare).toBeNull();
	});

	it('counts debts, financial holdings and pension elements', () => {
		const f = facts({
			S03: { work: 'employee' },
			S08: { debt_types: ['car', 'personal_loan'] },
			S10: { holdings: ['savings_book', 'etf', 'property', 'business_stakes', 'crypto', 'other'] },
			S15: { tfr: 'unknown', pension_fund: 'unsure_type', pension_sim: 'knows' }
		});
		expect(f.debtCount).toBe(2);
		expect(f.holdingsCount).toBe(3);
		expect(f.pensionKnown).toBe(1);
		expect(f.pensionTotal).toBe(3);
		expect(facts({ S08: { debt_types: ['none'] } }).debtCount).toBe(0);
		expect(facts({}).debtCount).toBeNull();
		expect(facts({ S03: { work: 'professional' } }).pensionTotal).toBe(2);
		expect(
			facts({
				S03: { work: 'employee' },
				S15: { tfr: 'fund', pension_fund: 'open', pension_sim: 'knows' }
			}).pensionKnown
		).toBe(3);
	});
});
