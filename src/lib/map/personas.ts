import type { AreaId, Clarity } from './types.ts';
import type { MapAnswers } from './facts.ts';

export interface Persona {
	name: string;
	/** Who the persona is, in Italian, for the review booklet (`just review`). */
	summary: string;
	answers: MapAnswers;
	expected: {
		/** Rule ids in order. */
		highlights: string[];
		/** Tier 6 sentences printed in the area paragraphs, in area order. */
		firmPoints?: string[];
		/** The four values of "I numeri della mappa" on page 1; `null` is "non calcolabile". */
		numbers?: (string | null)[];
		clarity?: Partial<Record<AreaId, Clarity>>;
		retiredLine?: boolean;
		incomplete?: boolean;
	};
}

/** The nine personas of `docs/map-spec.md` section 9; fields not listed are missing. */
export const PERSONAS: Persona[] = [
	{
		name: 'P1 Giulia',
		summary:
			'Giovane, vive da sola e lavora come dipendente. Entrate di fascia medio-bassa, un piccolo prestito personale, poca liquidità e nessuna quota messa da parte.',
		answers: {
			S01: { age_band: '18_25', marital: 'single', children: 'no' },
			S02: { property: 'none' },
			S03: { work: 'employee', income_role: 'sole' },
			S05: { income_self: '1500_2500' },
			S06: { fixed: '800_1500', tracking: 'no' },
			S07: { liquidity: 'lt_10000', emergency: 'probably_no' },
			S08: { debt_types: ['personal_loan'], instalments: 'lt_1000' },
			S09: { saving_habit: 'no_quota' },
			S10: { investments: 'no', holdings: ['none'] },
			S11: { pac: 'no' },
			S13: { purpose: 'no' },
			S14: { life_cover: 'none' },
			S15: { pension_fund: 'no', tfr: 'unknown', pension_sim: 'never' },
			S16: {
				wealth_estimate: 'no',
				heirs: 'never_looked',
				succession: 'later',
				succession_reason: 'too_small'
			},
			S17: { goals: ['buy_home', 'freedom'] }
		},
		expected: { highlights: ['RI-05', 'SA-02', 'PE-04'] }
	},
	{
		name: 'P2 Marco ed Elena',
		summary:
			'Coppia sui quarant’anni con due figli, il mutuo e un finanziamento. Un solo reddito principale, risparmi soprattutto sul conto e in prodotti della banca; figli, pensione e mutuo tra gli obiettivi.',
		answers: {
			S01: { age_band: '36_45', marital: 'married', children: 'two', children_independent: 'none' },
			S02: { property: 'main_home' },
			S03: { work: 'employee', income_role: 'main' },
			S05: { income_household: '2500_5000' },
			S06: { fixed: '1500_2500', tracking: 'sometimes' },
			S07: { liquidity: '10000_50000', emergency: 'probably_yes' },
			S08: { debt_types: ['mortgage', 'car'], instalments: '1000_1500' },
			S09: { saving_habit: 'variable', saving_amount: '100_500' },
			S10: { investments: 'mostly_account', holdings: ['savings_book', 'insurance', 'property'] },
			S11: { pac: 'no' },
			S12: { chosen_by: 'bank', costs_returns: 'neither', last_review: '3_5' },
			S13: { purpose: 'vague' },
			S14: { life_cover: 'tcm' },
			S15: {
				pension_fund: 'no',
				tfr: 'company',
				children_pension: 'neither',
				pension_sim: 'never'
			},
			S16: {
				wealth_estimate: 'roughly',
				heirs: 'all',
				succession: 'later'
			},
			S17: { goals: ['children', 'retirement', 'mortgage'] }
		},
		expected: { highlights: ['PE-02', 'SA-05', 'PR-14'] }
	},
	{
		name: 'P3 Salvatore',
		summary:
			'Genitore separato sui cinquant’anni con due figli ancora a carico e una sola entrata. Le spese fisse e le rate superano le entrate, nessuna riserva.',
		answers: {
			S01: {
				age_band: '46_55',
				marital: 'separated',
				children: 'two',
				children_independent: 'none'
			},
			S02: { property: 'none' },
			S03: { work: 'employee', income_role: 'sole' },
			S05: { income_self: '1500_2500' },
			S06: { fixed: '1500_2500', tracking: 'no' },
			S07: { liquidity: 'lt_10000', emergency: 'probably_no' },
			S08: { debt_types: ['personal_loan', 'salary_loan', 'overdraft'], instalments: '1000_1500' },
			S09: { saving_habit: 'cannot' },
			S10: { investments: 'no', holdings: ['none'] },
			S11: { pac: 'no' },
			S13: { purpose: 'no' },
			S14: { life_cover: 'none' },
			S15: {
				pension_fund: 'no',
				tfr: 'unknown',
				children_pension: 'unknown',
				pension_sim: 'where_start'
			},
			S16: {
				wealth_estimate: 'no',
				heirs: 'not_sure',
				succession: 'no',
				succession_reason: 'unaware'
			},
			S17: { goals: ['children', 'freedom'] }
		},
		expected: {
			highlights: ['RI-03', 'PR-02', 'SA-02'],
			numbers: [
				'da +1.000 a −2.500 €',
				'fino a circa 4 mesi',
				'tra 12.000 e 18.000 €',
				'tra 7.500 e 12.000 €'
			]
		}
	},
	{
		name: 'P4 Francesca',
		summary:
			'Coppia senza figli, buoni redditi, con prodotti della banca, fondi, ETF e un piano di accumulo. Ogni mese mette da parte una cifra importante; proteggere il patrimonio e la pensione tra gli obiettivi.',
		answers: {
			S01: { age_band: '36_45', marital: 'married', children: 'no' },
			S02: { property: 'both' },
			S03: { work: 'employee', income_role: 'shared' },
			S05: { income_household: '5000_10000' },
			S06: { fixed: '1500_2500', tracking: 'regular' },
			S07: { liquidity: '50000_150000', emergency: 'adequate' },
			S08: { debt_types: ['none'] },
			S09: { saving_habit: 'monthly', saving_amount: '1000_2000' },
			S10: {
				investments: 'yes',
				holdings: ['funds', 'insurance', 'etf', 'govt_bonds', 'pension_fund', 'property']
			},
			S11: { pac: 'yes', pac_amount: '250_500' },
			S12: { chosen_by: 'bank', costs_returns: 'returns_only', last_review: '5_10' },
			S13: { purpose: 'vague' },
			S14: { life_cover: 'other' },
			S15: { pension_fund: 'open', tfr: 'fund', pension_sim: 'knows' },
			S16: { wealth_estimate: 'unsure', heirs: 'all', succession: 'thought' },
			S17: { goals: ['retirement', 'grow_wealth', 'protect'] }
		},
		expected: { highlights: ['SA-05', 'PR-07', 'SA-07'], firmPoints: ['IO-06'] }
	},
	{
		name: 'P5 Anna',
		summary:
			'Coppia con un figlio, risposte quasi tutte «Non lo so»: entrate, spese, liquidità e rate non note. È il caso in cui la mappa dice soprattutto che cosa non può ancora calcolare.',
		answers: {
			S01: { age_band: '26_35', marital: 'married', children: 'one', children_independent: 'none' },
			S02: { property: 'none' },
			S03: { work: 'employee', income_role: 'shared' },
			S05: { income_household: 'unknown' },
			S06: { fixed: 'unknown', tracking: 'no' },
			S07: { liquidity: 'unknown', emergency: 'never_assessed' },
			S08: { debt_types: ['car'], instalments: 'unknown' },
			S09: { saving_habit: 'occasional', saving_amount: 'unknown' },
			S10: { investments: 'no', holdings: ['none'] },
			S11: { pac: 'no' },
			S13: { purpose: 'no' },
			S14: { life_cover: 'unknown' },
			S15: {
				pension_fund: 'unsure_type',
				tfr: 'unknown',
				children_pension: 'unknown',
				pension_sim: 'where_start'
			},
			S16: {
				wealth_estimate: 'no',
				heirs: 'never_looked',
				succession: 'no',
				succession_reason: 'unaware'
			},
			S17: { goals: ['buy_home'] }
		},
		expected: {
			highlights: ['SA-03', 'IO-05', 'RI-07'],
			numbers: [null, null, null, null],
			clarity: {
				IO: 'da_ricostruire',
				RI: 'da_ricostruire',
				DE: 'da_ricostruire',
				SA: 'da_ricostruire',
				PR: 'da_ricostruire',
				PE: 'da_ricostruire'
			}
		}
	},
	{
		name: 'P6 Luca',
		summary:
			'Lavoratore autonomo con tre figli, unica entrata e un mutuo. Conti dell’attività e personali in parte insieme, tasse accantonate senza regolarità: se si ferma, l’attività si ferma.',
		answers: {
			S01: {
				age_band: '36_45',
				marital: 'married',
				children: 'three_plus',
				children_independent: 'none'
			},
			S02: { property: 'main_home' },
			S03: { work: 'self_employed', income_role: 'sole' },
			S04: { separate_accounts: 'partly', tax_reserve: 'irregular', owner_dependency: 'stops' },
			S05: { income_household: '2500_5000' },
			S06: { fixed: '1500_2500', tracking: 'sometimes' },
			S07: { liquidity: 'lt_10000', emergency: 'probably_no' },
			S08: { debt_types: ['mortgage'], instalments: 'lt_1000' },
			S09: { saving_habit: 'occasional', saving_amount: 'lt_100' },
			S10: { investments: 'no', holdings: ['property'] },
			S11: { pac: 'no' },
			S13: { purpose: 'vague' },
			S14: { life_cover: 'none' },
			S15: { pension_fund: 'no', children_pension: 'neither', pension_sim: 'never' },
			S16: {
				wealth_estimate: 'roughly',
				heirs: 'all',
				succession: 'later'
			},
			S17: { goals: ['children', 'retirement'] }
		},
		expected: { highlights: ['RI-03', 'PR-02', 'PE-02'] }
	},
	{
		name: 'P7 Rosa',
		summary:
			'In pensione, vedova, vive da sola in una casa di proprietà con due figli indipendenti. Risparmi sul conto e in titoli di Stato; la parte sulla pensione non la riguarda.',
		answers: {
			S01: {
				age_band: 'over_65',
				marital: 'widowed',
				children: 'two',
				children_independent: 'all'
			},
			S02: { property: 'main_home' },
			S03: { work: 'retired', income_role: 'sole' },
			S05: { income_self: '1500_2500' },
			S06: { fixed: '800_1500', tracking: 'regular' },
			S07: { liquidity: '10000_50000', emergency: 'adequate' },
			S08: { debt_types: ['none'] },
			S09: { saving_habit: 'occasional', saving_amount: '100_500' },
			S10: { investments: 'mostly_account', holdings: ['savings_book', 'govt_bonds', 'property'] },
			S11: { pac: 'no' },
			S12: { chosen_by: 'self', costs_returns: 'both', last_review: 'over_10' },
			S13: { purpose: 'no' },
			S14: { life_cover: 'other' },
			S15: { children_pension: 'unknown' },
			S16: {
				wealth_estimate: 'roughly',
				heirs: 'all',
				succession: 'no',
				succession_reason: 'by_law'
			},
			S17: { goals: ['protect', 'children'] }
		},
		expected: { highlights: ['SA-03', 'PR-12', 'SA-14'], retiredLine: true }
	},
	{
		name: 'P8 Davide',
		summary:
			'Si è fermato dopo cinque schede: ha detto chi è, il lavoro e le entrate, ha preferito non indicare le spese. La mappa è incompleta e lo dice.',
		answers: {
			S01: { age_band: '26_35', marital: 'single', children: 'no' },
			S02: { property: 'none' },
			S03: { work: 'employee', income_role: 'sole' },
			S05: { income_self: '1500_2500' },
			S06: { fixed: 'withheld', tracking: 'sometimes' }
		},
		expected: {
			highlights: [],
			incomplete: true,
			clarity: {
				IO: 'da_ricostruire',
				RI: 'non_compilata',
				DE: 'non_compilata',
				SA: 'non_compilata',
				PR: 'non_compilata',
				PE: 'non_compilata'
			}
		}
	},
	{
		name: 'P9 Roberto',
		summary:
			'Imprenditore sui sessant’anni con due figli, redditi alti, azioni, ETF e quote della società, un piano di accumulo. Se si ferma, l’attività si ferma; passaggio generazionale e protezione del patrimonio tra gli obiettivi.',
		answers: {
			S01: { age_band: '56_65', marital: 'married', children: 'two', children_independent: 'some' },
			S02: { property: 'both' },
			S03: { work: 'entrepreneur', income_role: 'main' },
			S04: { separate_accounts: 'no', tax_reserve: 'irregular', owner_dependency: 'stops' },
			S05: { income_household: '10000_25000' },
			S06: { fixed: '2500_5000', tracking: 'sometimes' },
			S07: { liquidity: '50000_150000', emergency: 'sell_investments' },
			S08: { debt_types: ['car', 'overdraft'], instalments: 'lt_1000' },
			S09: { saving_habit: 'variable', saving_amount: '1000_2000' },
			S10: {
				investments: 'yes',
				holdings: ['shares', 'etf', 'insurance', 'business_stakes', 'property']
			},
			S11: { pac: 'yes', pac_amount: '500_1000' },
			S12: { chosen_by: 'advisor', costs_returns: 'costs_only', last_review: '1_3' },
			S13: { purpose: 'vague' },
			S14: { life_cover: 'tcm' },
			S15: { pension_fund: 'no', children_pension: 'fund_only', pension_sim: 'forgot' },
			S16: { wealth_estimate: 'roughly', heirs: 'some', succession: 'thought' },
			S17: { goals: ['handover', 'protect', 'extra_income'] }
		},
		expected: { highlights: ['RI-03', 'PR-09', 'DE-06'] }
	}
];
