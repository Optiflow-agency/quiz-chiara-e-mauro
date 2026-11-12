import type { Facts, Interval, Known } from './types.ts';

/** Answers as stored: sheet id, then field id; a multi stores an array, everything else a string. */
export type AnswerValue = string | string[];
export type MapAnswers = Record<string, Record<string, AnswerValue>>;

export interface Band {
	value: string;
	lo: number;
	hi: number | null;
}
/** Band boundaries keyed by band set name (`income_monthly`, ...); injected, never imported. */
export type BandSets = Record<string, Band[]>;

const MISSING: Known<never> = { status: 'missing' };

function readSingle(raw: unknown): Known<string> {
	if (typeof raw !== 'string' || raw === '') return MISSING;
	if (raw === 'unknown' || raw === 'withheld') return { status: raw };
	return { status: 'known', value: raw };
}

function readMulti(raw: unknown): Known<string[]> {
	if (!Array.isArray(raw)) return MISSING;
	const values = raw.filter((v): v is string => typeof v === 'string' && v !== '');
	if (values.length === 0) return MISSING;
	if (values.includes('unknown')) return { status: 'unknown' };
	if (values.includes('withheld')) return { status: 'withheld' };
	return { status: 'known', value: values };
}

function readBand(raw: unknown, set: Band[] | undefined): Known<Interval> {
	const answer = readSingle(raw);
	if (answer.status !== 'known') return answer;
	const band = set?.find((b) => b.value === answer.value);
	return band ? { status: 'known', value: { lo: band.lo, hi: band.hi ?? Infinity } } : MISSING;
}

/** Free text: known when it has any non-blank content. */
function readText(raw: unknown): Known<string> {
	return typeof raw === 'string' && raw.trim() !== ''
		? { status: 'known', value: raw.trim() }
		: MISSING;
}

const CHILDREN = new Map([
	['no', 0],
	['one', 1],
	['two', 2],
	['three_plus', 3]
]);

/** Ratio of two intervals; `null` when the divisor is exactly zero or the result is open at both ends. */
export function divide(n: Interval, d: Interval): Interval | null {
	if (d.lo === 0 && d.hi === 0) return null;
	const lo = n.lo / d.hi;
	const hi = n.hi === 0 ? 0 : n.hi / d.lo;
	return lo === 0 && hi === Infinity ? null : { lo, hi };
}

export const add = (a: Interval, b: Interval): Interval => ({ lo: a.lo + b.lo, hi: a.hi + b.hi });

/** `a - b`; `null` when the difference is open at both ends. */
export function subtract(a: Interval, b: Interval): Interval | null {
	const lo = a.lo - b.hi;
	const hi = a.hi - b.lo;
	return lo === -Infinity && hi === Infinity ? null : { lo, hi };
}

export const negate = (i: Interval): Interval => ({ lo: -i.hi, hi: -i.lo });

export const scale = (i: Interval, k: number): Interval => ({ lo: i.lo * k, hi: i.hi * k });

/**
 * The unexpected expense of sheet RI-02, in euros, by the lower bound of the income band: the highest step reached wins.
 */
const SHOCK_STEPS = [
	{ from: 10000, amount: 10000 },
	{ from: 2500, amount: 5000 }
];
const SHOCK_BASE = 2000;

const percent = (i: Interval | null) => i && scale(i, 100);

function count(k: Known<string[]>, ignored: string[]): number | null {
	return k.status === 'known' ? k.value.filter((v) => !ignored.includes(v)).length : null;
}

const NOT_FINANCIAL = ['none', 'property', 'business_stakes', 'other'];

/** The self-employed track: the respondent's own work is a profession, a business or self-employment. */
export const isBusiness = (f: Pick<Facts, 'work'>) =>
	f.work.status === 'known' &&
	['professional', 'entrepreneur', 'self_employed'].includes(f.work.value);

/**
 * `I − (E + R)`, read with two other answers (spec section 4, `margin`):
 * - a salary loan may already be taken out of the stated income, so its instalment may be
 *   counted twice: the best case leaves all instalments out;
 * - who saves every month has at least that saving left at month end, unless the two figures
 *   contradict each other (then the plain margin stays, and IO-08 says so).
 */
function marginOf(
	I: Interval,
	E: Interval,
	outgoings: Interval,
	S: Interval | null,
	debts: Known<string[]>,
	habit: Known<string>
): Interval | null {
	const salaryLoan = debts.status === 'known' && debts.value.includes('salary_loan');
	const margin = subtract(I, salaryLoan ? { lo: E.lo, hi: outgoings.hi } : outgoings);
	if (!margin || !S || habit.status !== 'known' || habit.value !== 'monthly') return margin;
	return S.lo > margin.hi ? margin : { lo: Math.max(margin.lo, S.lo), hi: margin.hi };
}

/** Turns stored answers into the facts the rules read, with the four answer states kept apart. */
export function buildFacts(answers: MapAnswers, bands: BandSets): Facts {
	const raw = (sheet: string, field: string): unknown => answers[sheet]?.[field];
	const single = (sheet: string, field: string) => readSingle(raw(sheet, field));
	const multi = (sheet: string, field: string) => readMulti(raw(sheet, field));
	const band = (sheet: string, field: string, set: string) =>
		readBand(raw(sheet, field), bands[set]);
	const interval = (k: Known<Interval>) => (k.status === 'known' ? k.value : null);

	const incomeSelf = band('S05', 'income_self', 'income_monthly');
	const incomeHousehold = band('S05', 'income_household', 'income_monthly');
	// Two wordings of one question, never shown together.
	const income = incomeSelf.status !== 'missing' ? incomeSelf : incomeHousehold;
	const fixed = band('S06', 'fixed', 'fixed_monthly');
	const liquidity = band('S07', 'liquidity', 'liquidity');
	const debt_types = multi('S08', 'debt_types');
	const noDebts =
		debt_types.status === 'known' &&
		debt_types.value.length === 1 &&
		debt_types.value[0] === 'none';
	const instalments: Known<Interval> = noDebts
		? { status: 'known', value: { lo: 0, hi: 0 } }
		: band('S08', 'instalments', 'instalments_monthly');
	const saving_amount = band('S09', 'saving_amount', 'saving_monthly');
	const pac_amount = band('S11', 'pac_amount', 'pac_monthly');
	const holdings = multi('S10', 'holdings');
	const work = single('S03', 'work');
	const children_answer = single('S01', 'children');
	const children_independent = single('S01', 'children_independent');
	const tfr = single('S15', 'tfr');
	const pension_fund = single('S15', 'pension_fund');
	const pension_sim = single('S15', 'pension_sim');

	const I = interval(income);
	const E = interval(fixed);
	const R = interval(instalments);
	const A = interval(liquidity);
	const S = interval(saving_amount);
	const P = interval(pac_amount);

	const outgoings = E && R && add(E, R);
	const saving_habit = single('S09', 'saving_habit');
	const margin = I && E && outgoings && marginOf(I, E, outgoings, S, debt_types, saving_habit);
	const threeMonths = outgoings && scale(outgoings, 3);
	const shockAmount = SHOCK_STEPS.find((s) => I && I.lo >= s.from)?.amount ?? SHOCK_BASE;
	const shockInterval = { lo: shockAmount, hi: shockAmount };
	const shockOverIncome = I && divide(shockInterval, I);
	const employee = work.status === 'known' && work.value === 'employee';
	const childCount =
		children_answer.status === 'known' ? (CHILDREN.get(children_answer.value) ?? null) : null;

	return {
		age_band: single('S01', 'age_band'),
		marital: single('S01', 'marital'),
		children_answer,
		children_independent,
		property: single('S02', 'property'),
		work,
		income_role: single('S03', 'income_role'),
		separate_accounts: single('S04', 'separate_accounts'),
		tax_reserve: single('S04', 'tax_reserve'),
		owner_dependency: single('S04', 'owner_dependency'),
		income,
		fixed,
		tracking: single('S06', 'tracking'),
		liquidity,
		emergency: single('S07', 'emergency'),
		debt_types,
		instalments,
		saving_habit,
		saving_amount,
		investments: single('S10', 'investments'),
		holdings,
		pac: single('S11', 'pac'),
		pac_amount,
		chosen_by: single('S12', 'chosen_by'),
		costs_returns: single('S12', 'costs_returns'),
		last_review: single('S12', 'last_review'),
		purpose: single('S13', 'purpose'),
		life_cover: single('S14', 'life_cover'),
		pension_fund,
		tfr,
		children_pension: single('S15', 'children_pension'),
		pension_sim,
		wealth_estimate: single('S16', 'wealth_estimate'),
		heirs: single('S16', 'heirs'),
		succession: single('S16', 'succession'),
		succession_reason: single('S16', 'succession_reason'),
		goals: multi('S17', 'goals'),
		improve: readText(raw('S18', 'improve')),
		question: readText(raw('S18', 'question')),

		outgoings,
		margin,
		marginYear: margin && scale(margin, 12),
		coverMonths: A && outgoings && divide(A, outgoings),
		shockAmount,
		shockWeeks: shockOverIncome && scale(shockOverIncome, 52 / 12),
		shockShare: A && percent(divide(shockInterval, A)),
		instalmentsYear: R && scale(R, 12),
		instalmentShare: percent(R && I && divide(R, I)),
		threeMonths,
		missingThree: threeMonths && A && subtract(threeMonths, A),
		savingYear: S && scale(S, 12),
		savingShare: percent(S && I && divide(S, I)),
		pacShare: percent(P && S && divide(P, S)),
		pacYear: P && scale(P, 12),
		children: childCount,
		dependentChildren:
			children_independent.status === 'known' &&
			['some', 'none'].includes(children_independent.value),
		debtCount: count(debt_types, ['none']),
		holdingsCount: count(holdings, NOT_FINANCIAL),
		pensionKnown: [
			employee && tfr.status === 'known',
			pension_fund.status === 'known' && pension_fund.value !== 'unsure_type',
			pension_sim.status === 'known' && pension_sim.value === 'knows'
		].filter(Boolean).length,
		pensionTotal: employee ? 3 : 2
	};
}
