import type { AreaId, Clarity, Facts, Known } from './types.ts';

/** `withheld`, missing and not applicable are all `absent`. */
export type SignalState = 'clear' | 'unclear' | 'absent';

export const AREA_IDS: AreaId[] = ['IO', 'RI', 'DE', 'SA', 'PR', 'PE'];

/** A signal is named after the fact it reads. */
interface Signal {
	area: AreaId;
	id: keyof Facts;
	read: (f: Facts) => SignalState;
}

/** Known and not listed as unclear is clear; `unknown` is unclear only where the spec says so. */
function read<T>(
	k: Known<T>,
	opts: { unclear?: (v: T) => boolean; unknown?: boolean } = {}
): SignalState {
	if (k.status === 'known') return opts.unclear?.(k.value) ? 'unclear' : 'clear';
	return k.status === 'unknown' && opts.unknown ? 'unclear' : 'absent';
}

const among =
	(...values: string[]) =>
	(v: string) =>
		values.includes(v);

/** Section 5 of the spec, one row per signal. */
export const SIGNALS: Signal[] = [
	{ area: 'IO', id: 'income', read: (f) => read(f.income, { unknown: true }) },
	{ area: 'IO', id: 'fixed', read: (f) => read(f.fixed, { unknown: true }) },
	{
		area: 'IO',
		id: 'tracking',
		read: (f) => read(f.tracking, { unclear: among('sometimes', 'no') })
	},
	{
		area: 'IO',
		id: 'separate_accounts',
		read: (f) => read(f.separate_accounts, { unclear: among('partly', 'no') })
	},
	{ area: 'RI', id: 'liquidity', read: (f) => read(f.liquidity, { unknown: true }) },
	{
		area: 'RI',
		id: 'emergency',
		read: (f) => read(f.emergency, { unclear: among('never_assessed') })
	},
	{ area: 'RI', id: 'tax_reserve', read: (f) => read(f.tax_reserve) },
	{ area: 'DE', id: 'debt_types', read: (f) => read(f.debt_types) },
	// `buildFacts` sets the instalments to zero when there are no debts.
	{ area: 'DE', id: 'instalments', read: (f) => read(f.instalments, { unknown: true }) },
	{ area: 'SA', id: 'saving_amount', read: (f) => read(f.saving_amount, { unknown: true }) },
	{ area: 'SA', id: 'holdings', read: (f) => read(f.holdings) },
	{
		area: 'SA',
		id: 'costs_returns',
		read: (f) => read(f.costs_returns, { unclear: among('costs_only', 'returns_only', 'neither') })
	},
	{ area: 'SA', id: 'last_review', read: (f) => read(f.last_review, { unknown: true }) },
	{ area: 'SA', id: 'purpose', read: (f) => read(f.purpose, { unclear: among('vague', 'no') }) },
	{
		area: 'SA',
		id: 'wealth_estimate',
		read: (f) => read(f.wealth_estimate, { unclear: among('roughly', 'no') })
	},
	{ area: 'PR', id: 'life_cover', read: (f) => read(f.life_cover, { unknown: true }) },
	{ area: 'PR', id: 'owner_dependency', read: (f) => read(f.owner_dependency) },
	{
		area: 'PR',
		id: 'heirs',
		read: (f) => read(f.heirs, { unclear: among('some', 'not_sure', 'never_looked') })
	},
	{
		area: 'PR',
		id: 'children_pension',
		read: (f) => read(f.children_pension, { unknown: true })
	},
	{ area: 'PE', id: 'tfr', read: (f) => read(f.tfr, { unknown: true }) },
	{
		area: 'PE',
		id: 'pension_fund',
		read: (f) => read(f.pension_fund, { unclear: among('unsure_type') })
	},
	{
		area: 'PE',
		id: 'pension_sim',
		read: (f) => read(f.pension_sim, { unclear: among('forgot', 'never', 'where_start') })
	}
];

/** The answers that feed each area (spec section 5), signals or not. */
const FIELDS: Record<AreaId, (keyof Facts)[]> = {
	IO: ['income', 'fixed', 'tracking', 'separate_accounts'],
	RI: ['liquidity', 'emergency', 'tax_reserve'],
	DE: ['debt_types', 'instalments'],
	SA: [
		'saving_habit',
		'saving_amount',
		'investments',
		'holdings',
		'pac',
		'pac_amount',
		'chosen_by',
		'costs_returns',
		'last_review',
		'purpose',
		'wealth_estimate'
	],
	PR: [
		'life_cover',
		'owner_dependency',
		'heirs',
		'succession',
		'succession_reason',
		'children_pension'
	],
	PE: ['pension_fund', 'tfr', 'pension_sim']
};

/** Some field of the area has an answer, an escape included. */
function answeredIn(facts: Facts, area: AreaId): boolean {
	return FIELDS[area].some((id) => {
		const fact = facts[id];
		return typeof fact === 'object' && fact !== null && 'status' in fact
			? fact.status !== 'missing'
			: false;
	});
}

export interface AreaClarity {
	clarity: Clarity;
	/** At least one signal of the area was withheld. */
	withheld: boolean;
	/** The person is already retired, so the pension area does not apply. */
	notApplicable: boolean;
}

/**
 * State rules of section 5: "Non compilata" only when no field of the area has an answer; with
 * answers but no signal to read, the picture is partial.
 */
export function stateOf(signals: SignalState[], answered: boolean): Clarity {
	const present = signals.filter((s) => s !== 'absent');
	if (present.length === 0) return answered ? 'in_parte' : 'non_compilata';
	const unclear = present.filter((s) => s === 'unclear').length;
	if (unclear === 0) return 'chiara';
	return unclear * 2 >= present.length ? 'da_ricostruire' : 'in_parte';
}

export function assessAreas(facts: Facts): Record<AreaId, AreaClarity> {
	const result = {} as Record<AreaId, AreaClarity>;
	for (const area of AREA_IDS) {
		const own = SIGNALS.filter((s) => s.area === area);
		const states = own.map((s) => s.read(facts));
		result[area] = {
			clarity: stateOf(states, answeredIn(facts, area)),
			withheld: own.some((s) => {
				const fact = facts[s.id];
				return typeof fact === 'object' && fact !== null && 'status' in fact
					? fact.status === 'withheld'
					: false;
			}),
			notApplicable:
				area === 'PE' && facts.work.status === 'known' && facts.work.value === 'retired'
		};
	}
	return result;
}
