import { mapCopy } from '../content/map.it.ts';
import type { Slots } from './types.ts';
import { makeWording } from './wording.ts';

/**
 * Slot values for filling any template of the copy, sized like the persona maps (the widest
 * bands and the longest phrase of each group). For tests and the realistic-maximum document:
 * a template filled with these must come out whole, with no `{placeholder}` left.
 */
const w = makeWording(mapCopy.wording);
const { phrases } = mapCopy.wording;

const longest = (group: string) =>
	Object.values(phrases[group]).reduce((a, b) => (b.length > a.length ? b : a));

const eur = w.eur({ lo: 52000, hi: 125000 });
const share = w.share({ lo: 55, hi: 95 });

export const SAMPLE_SLOTS: Slots = {
	margin_eur: eur ?? '',
	gap_eur: eur ?? '',
	margin_hi: w.number(1900),
	gap_hi: w.number(1600),
	margin_year_eur: eur ?? '',
	fixed_eur: eur ?? '',
	missing_io: longest('missing_io'),
	cover_months: w.months({ lo: 5.4, hi: 15.6 }) ?? '',
	shock_amount: w.number(5000),
	shock_weeks: w.weeks({ lo: 2.1, hi: 9.8 }) ?? '',
	shock_share: share ?? '',
	saving_lo: w.number(1000),
	dependent_children_phrase: longest('dependent_children'),
	children_phrase: longest('children'),
	outgoings_eur: eur ?? '',
	liquidity_eur: eur ?? '',
	tax_phrase: longest('tax'),
	debt_count_phrase: longest('debt_count'),
	instalments_year_eur: eur ?? '',
	instalment_share: share ?? '',
	saving_eur: eur ?? '',
	saving_share: share ?? '',
	saving_year_eur: eur ?? '',
	goal_name_cap: longest('goal'),
	goals_count_phrase: longest('goals_count'),
	holdings_count: longest('count'),
	pac_share: share ?? '',
	pac_eur: eur ?? '',
	pac_year_eur: eur ?? '',
	review_phrase: longest('review'),
	three_months_eur: eur ?? '',
	missing_three_eur: eur ?? '',
	assets_list: w.list(Object.values(phrases.assets)),
	dependency_phrase: longest('dependency'),
	pension_total_phrase: longest('pension_total'),
	pension_elements: longest('pension_elements'),
	pension_known_phrase: longest('pension_known'),
	age_phrase_cap: longest('age')
};
