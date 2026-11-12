import { isBusiness, negate } from './facts.ts';
import { upperFirst } from './wording.ts';
import type { AreaId, Facts, Fired, Known, Lens, Rule, Slots, Tier, Wording } from './types.ts';

/** Bump on any change to a condition or a text, so a printed map says which rules built it. */
export const RULES_VERSION = '1.0.0';

/**
 * The sentence rules of `docs/map-spec.md` section 6, in document order (the order breaks ties
 * in paragraphs and highlight selection). Conditions use only known values, except where the spec
 * names an escape state. A rule returns the variant whose condition held first and its slot
 * values, already worded; a slot that cannot be printed means the sentence is not printed. All
 * were signed off by Mauro and Chiara for 1.0.0; a new or changed rule goes back to
 * `approved: false` (it then prints only in draft mode) until they sign it off again.
 */

const val = <T>(k: Known<T>): T | undefined => (k.status === 'known' ? k.value : undefined);
const isIn = (v: string | undefined, options: string[]) => v !== undefined && options.includes(v);
const hasAny = (v: string[] | undefined, options: string[]) =>
	v !== undefined && v.some((x) => options.includes(x));
const only = (v: string[] | undefined, x: string) => v?.length === 1 && v[0] === x;

type SlotInput = Record<string, string | number | null>;

/** Fires with the given variant; a slot that is `null` (not printable) means no sentence. */
function fire(variant: string | undefined, input: SlotInput = {}): Fired | null {
	const slots: Slots = {};
	for (const [name, value] of Object.entries(input)) {
		if (value === null) return null;
		slots[name] = value;
	}
	return variant === undefined ? { slots } : { variant, slots };
}

function rule(
	id: string,
	area: AreaId,
	lens: Lens,
	tier: Tier,
	reads: Rule['reads'],
	when: Rule['when']
): Rule {
	return { id, area, lens, tier, reads, when, approved: true };
}

const NO_COVER = ['none', 'other'];

/**
 * The first of `options` the person chose among the goals, in the order of `options`
 * (the goal a sentence names when several of its goals were chosen).
 */
const firstGoal = (f: Facts, options: string[]) => options.find((g) => val(f.goals)?.includes(g));

/** What a sentence about protecting or passing on the family's wealth can name (spec PR-07). */
function assetKeys(f: Facts, withCovers: boolean): string[] {
	const holdings = val(f.holdings);
	return [
		isIn(val(f.property), ['main_home', 'both']) && 'home',
		isIn(val(f.property), ['other_only', 'both']) && 'other_property',
		isIn(val(f.investments), ['yes', 'mostly_account']) && 'investments',
		(holdings?.includes('business_stakes') || val(f.work) === 'entrepreneur') && 'business',
		withCovers && isIn(val(f.life_cover), ['tcm', 'disability', 'both', 'other']) && 'covers'
	].flatMap((key) => (key ? [key] : []));
}

/** At least one of home, other property, investments, business (PR-07 without the covers). */
export const hasAssets = (f: Facts) => assetKeys(f, false).length > 0;

/**
 * Nothing is put aside regularly: `cannot`, or `no_quota` when the monthly saving is not known
 * to be above zero (Q19 is asked after `no_quota` too).
 */
function noRegularSaving(f: Facts): boolean {
	const habit = val(f.saving_habit);
	const s = val(f.saving_amount);
	return habit === 'cannot' || (habit === 'no_quota' && !(s && s.lo > 0));
}

/** There are savings to speak of: not "cannot save" together with no investments. */
const hasSavings = (f: Facts) => !(val(f.saving_habit) === 'cannot' && val(f.investments) === 'no');

/** "Alcuni figli dipendono ancora economicamente da te", or one of the two plain phrasings. */
const dependentPhrase = (f: Facts, w: Wording) =>
	w.phrase(
		'dependent_children',
		val(f.children_independent) === 'some' ? 'some' : f.children === 1 ? 'one' : 'many'
	);

/** SA-03 and SA-15: one goal (only `other` counts as one) or how many, in letters. */
function goalsCount(f: Facts, w: Wording): Fired | null {
	const goals = val(f.goals);
	if (!goals) return null;
	const count = Math.max(1, goals.filter((g) => g !== 'other').length);
	return count === 1
		? fire('one')
		: fire('many', { goals_count_phrase: w.phrase('goals_count', count) });
}

/** PR-02 holds: the variant is the income role. Also read by PR-03, which gives way to it. */
const pr02 = (f: Facts) => {
	const role = val(f.income_role);
	return isIn(role, ['sole', 'main']) && f.dependentChildren && isIn(val(f.life_cover), NO_COVER)
		? role
		: undefined;
};

export const RULES: Rule[] = [
	// IO, Entrate e uscite
	rule('IO-01', 'IO', 'chiarezza', 'F', ['margin'], (f, w) => {
		const m = f.margin;
		if (!m) return null;
		if (m.lo >= 0) return fire('surplus', { margin_eur: w.eur(m) });
		if (m.hi < 0) return fire('shortfall', { gap_eur: w.eur(negate(m)) });
		if (m.hi === 0) return fire('even', { gap_eur: w.eur(negate(m)) });
		return fire('close', {
			margin_hi: Number.isFinite(m.hi) ? w.number(m.hi) : null,
			gap_hi: Number.isFinite(m.lo) ? w.number(-m.lo) : null
		});
	}),
	rule('IO-02', 'IO', 'chiarezza', 1, ['margin', 'tracking'], (f) => {
		if (!f.margin || f.margin.hi > 0) return null;
		const tracking = val(f.tracking);
		return fire(tracking !== undefined && tracking !== 'regular' ? 'untracked' : 'plain');
	}),
	rule('IO-03', 'IO', 'coerenza', 3, ['margin', 'marginYear', 'saving_habit'], (f, w) => {
		const habit = val(f.saving_habit);
		if (!f.margin || f.margin.lo <= 0 || !isIn(habit, ['cannot', 'no_quota'])) return null;
		return fire(habit, { margin_eur: w.eur(f.margin), margin_year_eur: w.eur(f.marginYear) });
	}),
	rule('IO-04', 'IO', 'strategia', 5, ['income_role', 'marital', 'fixed'], (f, w) => {
		const e = val(f.fixed);
		return val(f.income_role) === 'sole' && val(f.marital) === 'married' && e
			? fire(undefined, { fixed_eur: w.eur(e) })
			: null;
	}),
	rule('IO-05', 'IO', 'chiarezza', 4, ['income', 'fixed'], (f, w) => {
		const income = f.income.status === 'unknown';
		const fixed = f.fixed.status === 'unknown';
		if (!income && !fixed) return null;
		return fire(undefined, {
			missing_io: w.phrase('missing_io', income && fixed ? 'both' : income ? 'income' : 'fixed')
		});
	}),
	rule('IO-06', 'IO', 'chiarezza', 6, ['tracking', 'saving_habit', 'margin'], (f) =>
		val(f.tracking) === 'regular' &&
		val(f.saving_habit) === 'monthly' &&
		f.margin &&
		f.margin.lo > 0
			? fire(undefined)
			: null
	),
	rule('IO-07', 'IO', 'chiarezza', 4, ['separate_accounts', 'income', 'fixed'], (f) =>
		isIn(val(f.separate_accounts), ['partly', 'no']) && (val(f.income) || val(f.fixed))
			? fire(undefined)
			: null
	),
	rule('IO-08', 'IO', 'chiarezza', 4, ['saving_amount', 'margin'], (f, w) => {
		const s = val(f.saving_amount);
		return s && f.margin && s.lo > f.margin.hi
			? fire(undefined, { saving_lo: w.number(s.lo) })
			: null;
	}),

	// RI, Riserva per gli imprevisti
	rule('RI-01', 'RI', 'chiarezza', 'F', ['coverMonths'], (f, w) =>
		f.coverMonths ? fire(undefined, { cover_months: w.months(f.coverMonths) }) : null
	),
	rule(
		'RI-02',
		'RI',
		'chiarezza',
		'F',
		['shockAmount', 'shockWeeks', 'liquidity', 'shockShare'],
		(f, w) => {
			if (!f.shockWeeks) return null;
			const base = { shock_amount: w.number(f.shockAmount), shock_weeks: w.weeks(f.shockWeeks) };
			const a = val(f.liquidity);
			if (!a) return fire('plain', base);
			if (a.hi < f.shockAmount) return fire('above_reserve', base);
			return fire('share', { ...base, shock_share: w.share(f.shockShare) });
		}
	),
	rule(
		'RI-03',
		'RI',
		'protezione',
		2,
		['dependentChildren', 'emergency', 'children_independent', 'children'],
		(f, w) => {
			const emergency = val(f.emergency);
			if (!f.dependentChildren || !isIn(emergency, ['probably_no', 'sell_investments']))
				return null;
			return fire(emergency, { dependent_children_phrase: dependentPhrase(f, w) });
		}
	),
	rule('RI-04', 'RI', 'coerenza', 3, ['emergency', 'coverMonths'], (f, w) => {
		const c = f.coverMonths;
		const emergency = val(f.emergency);
		if (!c) return null;
		if (isIn(emergency, ['probably_no', 'sell_investments']) && c.lo >= 6) {
			return fire('not_enough');
		}
		return isIn(emergency, ['adequate', 'probably_yes']) && c.hi < 3
			? fire('enough', { cover_months: w.months(c) })
			: null;
	}),
	rule(
		'RI-05',
		'RI',
		'coerenza',
		3,
		['emergency', 'saving_habit', 'saving_amount', 'outgoings'],
		(f, w) =>
			val(f.emergency) === 'probably_no' && noRegularSaving(f) && f.outgoings
				? fire(undefined, { outgoings_eur: w.eur(f.outgoings) })
				: null
	),
	rule('RI-06', 'RI', 'strategia', 5, ['coverMonths', 'investments', 'purpose'], (f) =>
		f.coverMonths &&
		f.coverMonths.lo >= 12 &&
		val(f.investments) === 'mostly_account' &&
		isIn(val(f.purpose), ['vague', 'no'])
			? fire(undefined)
			: null
	),
	rule('RI-07', 'RI', 'chiarezza', 4, ['liquidity', 'fixed'], (f, w) => {
		if (f.liquidity.status === 'unknown') return fire('liquidity');
		const a = val(f.liquidity);
		return a && f.fixed.status === 'unknown' ? fire('fixed', { liquidity_eur: w.eur(a) }) : null;
	}),
	rule('RI-08', 'RI', 'coerenza', 3, ['tax_reserve', 'coverMonths'], (f, w) => {
		const reserve = val(f.tax_reserve);
		if (!isIn(reserve, ['irregular', 'struggle'])) return null;
		const tax_phrase = w.phrase('tax', reserve as string);
		return fire(f.coverMonths ? 'months' : 'plain', { tax_phrase });
	}),

	// DE, Debiti e rate
	rule(
		'DE-01',
		'DE',
		'chiarezza',
		'F',
		['debt_types', 'instalments', 'instalmentsYear', 'instalmentShare'],
		(f, w) => {
			if (only(val(f.debt_types), 'none')) return fire('none');
			if (!val(f.instalments) || f.debtCount === null || !f.instalmentsYear) return null;
			const base = {
				debt_count_phrase: w.phrase('debt_count', f.debtCount),
				instalments_year_eur: w.eur(f.instalmentsYear)
			};
			const share = f.instalmentShare;
			if (share && share.lo >= 100) return fire('all_income', base);
			const instalment_share = w.share(share);
			return instalment_share !== null
				? fire('share', { ...base, instalment_share })
				: fire('amount', base);
		}
	),
	rule('DE-06', 'DE', 'coerenza', 3, ['debt_types', 'saving_habit'], (f) =>
		hasAny(val(f.debt_types), ['personal_loan', 'overdraft']) &&
		isIn(val(f.saving_habit), ['monthly', 'variable'])
			? fire(undefined)
			: null
	),
	rule('DE-07', 'DE', 'protezione', 2, ['debt_types', 'income_role', 'life_cover'], (f) => {
		const role = val(f.income_role);
		return hasAny(val(f.debt_types), ['mortgage']) &&
			isIn(role, ['sole', 'main']) &&
			isIn(val(f.life_cover), NO_COVER)
			? fire(role)
			: null;
	}),
	rule('DE-08', 'DE', 'chiarezza', 4, ['debtCount', 'instalments'], (f) =>
		(f.debtCount ?? 0) >= 1 && f.instalments.status === 'unknown' ? fire(undefined) : null
	),
	rule('DE-12', 'DE', 'chiarezza', 4, ['debt_types'], (f) => {
		const debts = val(f.debt_types);
		if (!hasAny(debts, ['salary_loan', 'overdraft'])) return null;
		return fire(debts?.includes('salary_loan') ? 'salary_loan' : 'overdraft');
	}),

	// SA, Risparmi, investimenti e patrimonio
	rule(
		'SA-01',
		'SA',
		'chiarezza',
		'F',
		['saving_habit', 'saving_amount', 'savingShare', 'savingYear'],
		(f, w) => {
			if (val(f.saving_habit) === 'cannot') return fire('cannot');
			const s = val(f.saving_amount);
			if (!s || !f.savingYear) return null;
			const base = { saving_eur: w.eur(s), saving_year_eur: w.eur(f.savingYear) };
			const saving_share = w.share(f.savingShare);
			return saving_share !== null
				? fire('share', { ...base, saving_share })
				: fire('amount', base);
		}
	),
	rule('SA-02', 'SA', 'coerenza', 3, ['goals', 'saving_habit', 'saving_amount'], (f, w) => {
		const goal = firstGoal(f, ['capital', 'grow_wealth', 'extra_income', 'freedom']);
		return goal && noRegularSaving(f)
			? fire(undefined, { goal_name_cap: upperFirst(w.phrase('goal', goal)) })
			: null;
	}),
	rule('SA-03', 'SA', 'coerenza', 3, ['purpose', 'goals', 'saving_habit', 'investments'], (f, w) =>
		val(f.purpose) === 'no' && hasSavings(f) ? goalsCount(f, w) : null
	),
	rule('SA-05', 'SA', 'chiarezza', 4, ['costs_returns'], (f) => {
		const answer = val(f.costs_returns);
		return isIn(answer, ['costs_only', 'returns_only', 'neither']) ? fire(answer) : null;
	}),
	rule('SA-07', 'SA', 'strategia', 5, ['chosen_by', 'purpose'], (f) =>
		isIn(val(f.chosen_by), ['bank', 'post_office']) && isIn(val(f.purpose), ['vague', 'no'])
			? fire(undefined)
			: null
	),
	rule('SA-08', 'SA', 'chiarezza', 5, ['holdingsCount'], (f, w) =>
		(f.holdingsCount ?? 0) >= 4
			? fire(undefined, { holdings_count: w.phrase('count', f.holdingsCount ?? 0) })
			: null
	),
	rule('SA-09', 'SA', 'strategia', 5, ['property', 'holdings', 'work'], (f) =>
		isIn(val(f.property), ['other_only', 'both']) ||
		hasAny(val(f.holdings), ['business_stakes']) ||
		val(f.work) === 'entrepreneur'
			? fire(undefined)
			: null
	),
	rule(
		'SA-12',
		'SA',
		'chiarezza',
		'F',
		['pac', 'pac_amount', 'saving_amount', 'pacShare', 'pacYear'],
		(f, w) => {
			const p = val(f.pac_amount);
			if (val(f.pac) !== 'yes' || !p || !f.pacYear) return null;
			const pac_share = f.pacShare && f.pacShare.hi <= 100 ? w.share(f.pacShare) : null;
			const s = val(f.saving_amount);
			return pac_share !== null && s
				? fire('share', { saving_eur: w.eur(s), pac_share })
				: fire('amount', { pac_eur: w.eur(p), pac_year_eur: w.eur(f.pacYear) });
		}
	),
	rule('SA-13', 'SA', 'strategia', 5, ['last_review'], (f, w) => {
		const review = val(f.last_review);
		if (f.last_review.status === 'unknown') return fire('unknown');
		return isIn(review, ['5_10', 'over_10'])
			? fire('years', { review_phrase: w.phrase('review', review as string) })
			: null;
	}),
	rule(
		'SA-14',
		'SA',
		'chiarezza',
		4,
		['wealth_estimate', 'property', 'investments', 'holdings', 'work'],
		(f) => {
			// The total matters where there is something to add up: one kind of asset for "no",
			// two for "more or less" (with one kind, its value is the total).
			const kinds = assetKeys(f, false).length;
			const estimate = val(f.wealth_estimate);
			return (estimate === 'no' && kinds >= 1) || (estimate === 'roughly' && kinds >= 2)
				? fire(undefined)
				: null;
		}
	),
	rule('SA-15', 'SA', 'coerenza', 5, ['purpose', 'goals', 'saving_habit', 'investments'], (f, w) =>
		val(f.purpose) === 'vague' && hasSavings(f) ? goalsCount(f, w) : null
	),

	// PR, Protezione e passaggio generazionale
	rule('PR-01', 'PR', 'protezione', 'F', ['threeMonths', 'liquidity', 'missingThree'], (f, w) => {
		if (!f.threeMonths) return null;
		const three_months_eur = w.eur(f.threeMonths);
		const a = val(f.liquidity);
		if (a && f.missingThree && f.missingThree.lo > 0) {
			return fire('missing', {
				three_months_eur,
				liquidity_eur: w.eur(a),
				missing_three_eur: w.eur(f.missingThree)
			});
		}
		if (a && a.lo >= f.threeMonths.hi) return fire('covered', { three_months_eur });
		return fire(a ? 'maybe' : 'plain', { three_months_eur });
	}),
	rule(
		'PR-02',
		'PR',
		'protezione',
		2,
		['income_role', 'children', 'children_independent', 'life_cover'],
		(f, w) => {
			const role = pr02(f);
			return role && f.children !== null
				? fire(role, { children_phrase: w.phrase('children', f.children) })
				: null;
		}
	),
	rule(
		'PR-03',
		'PR',
		'protezione',
		2,
		['life_cover', 'dependentChildren', 'children_independent', 'income_role', 'children'],
		(f, w) => {
			if (val(f.life_cover) !== 'none' || !f.dependentChildren || pr02(f)) return null;
			return fire(undefined, { dependent_children_phrase: dependentPhrase(f, w) });
		}
	),
	rule('PR-06', 'PR', 'protezione', 5, ['work', 'life_cover'], (f) =>
		isBusiness(f) && isIn(val(f.life_cover), ['none', 'tcm', 'other']) ? fire(undefined) : null
	),
	rule(
		'PR-07',
		'PR',
		'trasmissione',
		5,
		['goals', 'property', 'investments', 'holdings', 'work', 'life_cover'],
		(f, w) => {
			if (!hasAny(val(f.goals), ['protect'])) return null;
			const assets = assetKeys(f, true).map((k) => w.phrase('assets', k));
			return assets.length > 0
				? fire(assets.length === 1 ? 'one' : 'more', { assets_list: w.list(assets) })
				: null;
		}
	),
	rule('PR-08', 'PR', 'chiarezza', 4, ['life_cover'], (f) =>
		f.life_cover.status === 'unknown' ? fire(undefined) : null
	),
	rule('PR-09', 'PR', 'protezione', 2, ['owner_dependency', 'coverMonths'], (f, w) => {
		const dependency = val(f.owner_dependency);
		return isIn(dependency, ['slows', 'stops']) && f.coverMonths
			? fire(undefined, {
					dependency_phrase: w.phrase('dependency', dependency as string),
					cover_months: w.months(f.coverMonths)
				})
			: null;
	}),
	rule('PR-10', 'PR', 'trasmissione', 3, ['goals', 'owner_dependency'], (f) =>
		hasAny(val(f.goals), ['handover']) && val(f.owner_dependency) === 'stops'
			? fire(undefined)
			: null
	),
	rule('PR-11', 'PR', 'coerenza', 3, ['goals', 'succession'], (f, w) => {
		const goal = firstGoal(f, ['handover']);
		const succession = val(f.succession);
		return goal && isIn(succession, ['thought', 'no', 'later'])
			? fire(succession === 'thought' ? 'thought' : 'open', {
					goal_name_cap: upperFirst(w.phrase('goal', goal))
				})
			: null;
	}),
	rule(
		'PR-12',
		'PR',
		'trasmissione',
		4,
		['succession_reason', 'wealth_estimate', 'property', 'investments', 'holdings', 'work'],
		(f) => {
			const reason = val(f.succession_reason);
			if (reason === 'by_law') return fire('by_law');
			return reason === 'too_small' &&
				isIn(val(f.wealth_estimate), ['roughly', 'no']) &&
				hasAssets(f)
				? fire('too_small')
				: null;
		}
	),
	rule(
		'PR-13',
		'PR',
		'trasmissione',
		4,
		['heirs', 'property', 'investments', 'holdings', 'work'],
		(f, w) => {
			const keys = assetKeys(f, false);
			if (!isIn(val(f.heirs), ['not_sure', 'never_looked']) || keys.length === 0) return null;
			// "La casa" and "l'attività" take a singular verb; the other phrases are plural.
			const singular = keys.length === 1 && ['home', 'business'].includes(keys[0]);
			return fire(singular ? 'one' : 'more', {
				assets_list: w.list(keys.map((k) => w.phrase('assets', k)))
			});
		}
	),
	rule('PR-14', 'PR', 'trasmissione', 5, ['children_pension', 'goals'], (f) =>
		val(f.children_pension) === 'neither' && hasAny(val(f.goals), ['children'])
			? fire(undefined)
			: null
	),

	// PE, Pensione e TFR
	rule(
		'PE-01',
		'PE',
		'chiarezza',
		'F',
		['tfr', 'pension_fund', 'pension_sim', 'pensionKnown', 'pensionTotal'],
		(f, w) => {
			// Withheld answers say nothing about what the person knows.
			const read = [f.tfr, f.pension_fund, f.pension_sim].some(
				(k) => k.status === 'known' || k.status === 'unknown'
			);
			if (!read) return null;
			if (f.pensionKnown === f.pensionTotal) {
				return fire('all', { pension_total_phrase: w.phrase('pension_total', f.pensionTotal) });
			}
			const pension_elements = w.phrase(
				'pension_elements',
				f.pensionTotal === 3 ? 'employee' : 'other'
			);
			if (f.pensionKnown === 0) return fire('none', { pension_elements });
			return fire('some', {
				pension_elements,
				pension_known_phrase: w.phrase('pension_known', f.pensionKnown)
			});
		}
	),
	rule('PE-02', 'PE', 'coerenza', 3, ['goals', 'pension_sim'], (f, w) => {
		const goal = firstGoal(f, ['retirement', 'extra_income']);
		const sim = val(f.pension_sim);
		return goal && isIn(sim, ['forgot', 'never', 'where_start'])
			? fire(sim === 'forgot' ? 'forgot' : 'never', {
					goal_name_cap: upperFirst(w.phrase('goal', goal))
				})
			: null;
	}),
	rule('PE-03', 'PE', 'chiarezza', 4, ['age_band', 'pension_sim'], (f, w) => {
		const age = val(f.age_band);
		return isIn(age, ['46_55', '56_65']) &&
			isIn(val(f.pension_sim), ['forgot', 'never', 'where_start'])
			? fire(undefined, { age_phrase_cap: w.phrase('age', age as string) })
			: null;
	}),
	rule('PE-04', 'PE', 'chiarezza', 4, ['tfr'], (f) =>
		f.tfr.status === 'unknown' ? fire(undefined) : null
	),
	rule('PE-05', 'PE', 'chiarezza', 4, ['work', 'pension_sim'], (f) =>
		isBusiness(f) && isIn(val(f.pension_sim), ['never', 'where_start']) ? fire(undefined) : null
	),
	rule('PE-07', 'PE', 'chiarezza', 4, ['pension_fund'], (f) =>
		val(f.pension_fund) === 'unsure_type' ? fire(undefined) : null
	)
];

/**
 * Readings that say the same thing in different words (spec section 6, "One reading per topic"):
 * of each group only the first that fires, in the order listed, is printed.
 */
export const TOPICS: string[][] = [
	// What happens if the respondent's income stops and there is no cover.
	['PR-02', 'PR-03', 'DE-07', 'PR-06'],
	// Goals against what is put aside.
	['SA-02', 'SA-03', 'SA-15'],
	// Passing on the family business or wealth.
	['PR-10', 'PR-11']
];
