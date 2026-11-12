/**
 * Contract between the three parts of the map: facts (from answers), rules (cross-readings)
 * and the PDF layout. Content is specified in `docs/map-spec.md`.
 */

/**
 * Euro or ratio range. `hi: Infinity` is an open upper end; a difference can also have
 * `lo: -Infinity`. Bands never collapse to a point.
 */
export interface Interval {
	lo: number;
	hi: number;
}

/** The four answer states stay distinct: a missing datum limits what can be said. */
export type Known<T> =
	{ status: 'known'; value: T } | { status: 'unknown' | 'withheld' | 'missing' };

export type AreaId = 'IO' | 'RI' | 'DE' | 'SA' | 'PR' | 'PE';
/** A place on the printed map: the six areas, the household at the centre, and the goals. */
export type NodeId = AreaId | 'VOI' | 'OB';
export type Lens = 'chiarezza' | 'coerenza' | 'strategia' | 'protezione' | 'trasmissione';
export type Clarity = 'chiara' | 'in_parte' | 'da_ricostruire' | 'non_compilata';

/** 1-5 can be highlighted, 6 is a firm point (IO-06), 'F' a computed-fact sentence. */
export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 'F';

/** Answers as the rules read them. Field names follow the catalogue field ids. */
export interface Facts {
	// S01-S03
	age_band: Known<string>;
	marital: Known<string>;
	/** The answer to `children` (`no`, `one`, `two`, `three_plus`). */
	children_answer: Known<string>;
	children_independent: Known<string>;
	property: Known<string>;
	work: Known<string>;
	income_role: Known<string>;
	// S04 (self-employed track)
	separate_accounts: Known<string>;
	tax_reserve: Known<string>;
	owner_dependency: Known<string>;
	// S05-S06: `income` is `income_self` or `income_household`, whichever was asked.
	income: Known<Interval>;
	fixed: Known<Interval>;
	tracking: Known<string>;
	// S07-S08
	liquidity: Known<Interval>;
	emergency: Known<string>;
	debt_types: Known<string[]>;
	/** `[0, 0]` when there are no debts; the answer otherwise. */
	instalments: Known<Interval>;
	// S09-S13
	saving_habit: Known<string>;
	saving_amount: Known<Interval>;
	investments: Known<string>;
	holdings: Known<string[]>;
	pac: Known<string>;
	pac_amount: Known<Interval>;
	chosen_by: Known<string[]>;
	costs_returns: Known<string>;
	last_review: Known<string>;
	purpose: Known<string>;
	// S14-S16
	life_cover: Known<string>;
	pension_fund: Known<string>;
	tfr: Known<string>;
	children_pension: Known<string>;
	pension_sim: Known<string>;
	wealth_estimate: Known<string>;
	heirs: Known<string>;
	succession: Known<string>;
	succession_reason: Known<string>;
	// S17-S18
	goals: Known<string[]>;
	improve: Known<string>;
	question: Known<string>;

	// Computed facts (spec section 4); `null` when not computable.
	/** Fixed spending and instalments together. */
	outgoings: Interval | null;
	margin: Interval | null;
	marginYear: Interval | null;
	coverMonths: Interval | null;
	/** Euros of the reference unexpected expense: it depends on the income band. */
	shockAmount: number;
	shockWeeks: Interval | null;
	shockShare: Interval | null;
	instalmentsYear: Interval | null;
	instalmentShare: Interval | null;
	threeMonths: Interval | null;
	missingThree: Interval | null;
	savingYear: Interval | null;
	savingShare: Interval | null;
	pacShare: Interval | null;
	pacYear: Interval | null;
	/** Number of children (`three_plus` counts as 3). */
	children: number | null;
	/** Some child still depends on the respondent. */
	dependentChildren: boolean;
	debtCount: number | null;
	holdingsCount: number | null;
	pensionKnown: number;
	pensionTotal: number;
}

/** Slot values are finished Italian strings (or counts): rules format them through `Wording`. */
export type Slots = Record<string, string | number>;

/** What a rule returns when it fires: the variant whose condition held and the slot values. */
export interface Fired {
	/** Key into the rule's copy; single-text rules leave it out. */
	variant?: string;
	slots: Slots;
}

/** Turns intervals into the wording of spec section 4; `null` when the value is not printable. */
export interface Wording {
	eur(i: Interval | null): string | null;
	/** Euro wording with "€" instead of "euro". */
	eurShort(i: Interval | null): string | null;
	months(i: Interval | null): string | null;
	weeks(i: Interval | null): string | null;
	share(i: Interval | null): string | null;
	/** A whole number with a dot for thousands. */
	number(n: number): string;
	/** A fixed phrase of the copy: `group` and `key` name it (e.g. `children`, 2). */
	phrase(group: string, key: string | number): string;
	/** Joins with commas and a final "e". */
	list(items: string[]): string;
}

/** A cross-reading: its logic. Its Italian copy lives in `$lib/content/map.it`, keyed by `id`. */
export interface Rule {
	id: string;
	area: AreaId;
	lens: Lens;
	tier: Tier;
	/** Facts the condition reads; listed for the rulebook. */
	reads: (keyof Facts)[];
	/** Variant and slots when the rule fires, `null` otherwise or when a slot is not printable. */
	when: (facts: Facts, w: Wording) => Fired | null;
	/** Unapproved rules print only in draft documents. */
	approved: boolean;
}

export interface RuleCopy {
	/** Template with `{slot}` placeholders; a record when the rule has variants, by variant key. */
	text: string | Record<string, string>;
	/** The question this reading raises, for page 4. */
	question?: string;
	/** What the text must never imply; for reviewers, never printed. */
	never?: string;
}

export interface Reading {
	ruleId: string;
	area: AreaId;
	lens: Lens;
	text: string;
	question?: string;
	/** The other places of the map whose facts the reading draws on (never its own area). */
	links: NodeId[];
}

/** A page-1 number split at its first digit, e.g. "restano tra" over "300 e 1.900 €". */
export interface Figure {
	/** Words before the first digit; empty when there are none. */
	lead: string;
	figure: string;
}

export interface AreaBlock {
	id: AreaId;
	title: string;
	clarity: Clarity;
	/** Replaces the clarity state when the area does not apply (pension for a retiree). */
	notApplicable?: string;
	/** The paragraph in print order; empty when nothing can be computed. */
	sentences: Reading[];
	/** Printed at the end of the paragraph when an answer of the area was withheld. */
	note?: string;
}

/** Everything the PDF prints, already in Italian: the layout decides nothing. */
export interface MapDocument {
	draft: boolean;
	/** ISO date. */
	generatedOn: string;
	versions: { catalogue: string; rules: string };
	incomplete: boolean;
	snapshot: {
		/** "Il punto di partenza": people, incomes and housing, no amounts. */
		context: string;
		/** Always four; `null` when the value is not computable. */
		numbers: { label: string; value: Figure | null }[];
		/** The goals and, when asked, the monthly saving; empty when the goals were not answered. */
		goals: string;
		/** "Per chi legge la mappa con te": who chose the investments, then the person's own words. */
		reader: { chosen: string | null; improve: string | null; question: string | null };
	};
	/** Always six, in fixed order. */
	areas: AreaBlock[];
	/** At most three. */
	highlights: Reading[];
	nextSteps: {
		questions: string[];
		gather: string[];
	};
}
