import { describe, expect, it } from 'vitest';
import { mapCopy } from '../content/map.it.ts';
import { buildMap, figureText, fill, linksOf, splitFigure } from './compose.ts';
import type { MapDeps } from './compose.ts';
import type { MapAnswers } from './facts.ts';
import { catalogue } from '../content/sheets.it.ts';
import { sanitizeAnswers } from '../survey/sanitize.ts';
import { PERSONAS } from './personas.ts';
import { RULES, RULES_VERSION, TOPICS } from './rules.ts';
import type { AreaId, Figure, MapDocument, Rule } from './types.ts';

/** A page-1 number as the spec words it, or `null` when not computable. */
const text = (value: Figure | null) => (value ? figureText(value) : null);

const NOW = new Date('2026-10-02T10:00:00Z');
const deps = (over: Partial<MapDeps> = {}): MapDeps => ({
	bands: catalogue.amountBandSets,
	rules: RULES,
	topics: TOPICS,
	copy: mapCopy,
	now: NOW,
	draft: false,
	catalogue: 'test-1',
	...over
});
const build = (answers: MapAnswers) => buildMap(answers, deps());
const area = (doc: MapDocument, id: AreaId) => doc.areas.find((a) => a.id === id)!;
const textOf = (doc: MapDocument, ruleId: string) =>
	doc.areas.flatMap((a) => a.sentences).find((s) => s.ruleId === ruleId)?.text;
const idsOf = (doc: MapDocument, id: AreaId) => area(doc, id).sentences.map((s) => s.ruleId);

describe('buildMap envelope', () => {
	const persona = PERSONAS[0];
	it('stamps date and versions', () => {
		const doc = build(persona.answers);
		expect(doc.generatedOn).toBe('2026-10-02');
		expect(doc.versions).toEqual({ catalogue: 'test-1', rules: RULES_VERSION });
		expect(doc.areas.map((a) => a.id)).toEqual(['IO', 'RI', 'DE', 'SA', 'PR', 'PE']);
		expect(doc.areas.map((a) => a.title)).toEqual([
			'Entrate e uscite',
			'Riserva per gli imprevisti',
			'Debiti e rate',
			'Risparmi, investimenti e patrimonio',
			'Protezione e passaggio generazionale',
			'Pensione e TFR'
		]);
	});

	it('adds the own question last in the questions to bring, trimmed and bounded', () => {
		const doc = build({
			...persona.answers,
			S18: { question: `  Posso chiedere? ${'x'.repeat(400)}` }
		});
		const last = doc.nextSteps.questions.at(-1) ?? '';
		expect(last.startsWith('Posso chiedere?')).toBe(true);
		expect(last.length).toBeLessThanOrEqual(300);
		expect(doc.snapshot.reader.question).toBe(last);
		expect(doc.nextSteps.questions.length).toBe(doc.highlights.length + 1);
	});

	it('has no own words when the fields are blank', () => {
		const { reader } = build({
			...persona.answers,
			S18: { improve: ' ', question: '   ' }
		}).snapshot;
		expect(reader).toEqual({ chosen: null, improve: null, question: null });
	});

	it('is incomplete below half of the visible schede', () => {
		// 16 schede are always visible; S04 and S12 are conditional.
		const always = ['S01', 'S02', 'S03', 'S05', 'S06', 'S07', 'S08', 'S09'];
		const sheets = (ids: string[]): MapAnswers =>
			Object.fromEntries(ids.map((id) => [id, { age_band: '18_25' }]));
		expect(build(sheets(always.slice(0, 7))).incomplete).toBe(true);
		expect(build(sheets(always)).incomplete).toBe(false);
		// With the self-employed track and investments, 18 are visible: 9 answered is half.
		const track: MapAnswers = { S03: { work: 'professional' }, S10: { investments: 'yes' } };
		const without = always.filter((id) => id !== 'S03');
		expect(build({ ...sheets(without.slice(1)), ...track }).incomplete).toBe(true);
		expect(build({ ...sheets(without), ...track }).incomplete).toBe(false);
	});
});

describe('draft switch', () => {
	const p3 = PERSONAS.find((x) => x.name.startsWith('P3'))!;
	const unapproved = RULES.map((r) => ({ ...r, approved: false }));

	it('prints nothing from unapproved rules in a final document', () => {
		const doc = buildMap(p3.answers, deps({ rules: unapproved, draft: false }));
		expect(doc.draft).toBe(false);
		expect(doc.highlights).toEqual([]);
		expect(doc.areas.flatMap((a) => a.sentences)).toEqual([]);
		expect(doc.nextSteps.questions).toEqual([]);
		expect(doc.nextSteps.gather).toEqual([]);
		// The numbers come from facts, not from a rule, so they still apply.
		expect(text(doc.snapshot.numbers[0].value)).toBe('da +1.000 a −2.500 €');
	});

	it('prints them in a draft', () => {
		const doc = buildMap(p3.answers, deps({ rules: unapproved, draft: true }));
		expect(doc.draft).toBe(true);
		expect(doc.highlights.map((h) => h.ruleId)).toEqual(['RI-03', 'PR-02', 'SA-02']);
		expect(doc.nextSteps.gather.length).toBeGreaterThan(0);
	});

	it('lets approved rules through one by one', () => {
		const rules = RULES.map((r) => ({ ...r, approved: r.id === 'RI-03' }));
		const doc = buildMap(p3.answers, deps({ rules }));
		expect(doc.highlights.map((h) => h.ruleId)).toEqual(['RI-03']);
	});
});

describe('highlight selection and paragraphs', () => {
	const fake = (id: string, areaId: AreaId, tier: Rule['tier']): Rule => ({
		id,
		area: areaId,
		lens: 'chiarezza',
		tier,
		reads: [],
		when: () => ({ slots: {} }),
		approved: true
	});
	const copy = {
		...mapCopy,
		rules: Object.fromEntries(
			['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => [id, { text: id, question: `Q${id}` }])
		)
	};
	// Every area is filled in, so no paragraph is left out as "Non compilata".
	const filled = PERSONAS.find((x) => x.name.startsWith('P4'))!.answers;
	const run = (rules: Rule[], topics: string[][] = []) =>
		buildMap(filled, deps({ rules, copy, topics }));
	const highlights = (rules: Rule[]) => run(rules).highlights.map((h) => h.ruleId);

	it('sorts by tier, then by document order, one area at a time first', () => {
		expect(
			highlights([
				fake('A', 'IO', 5),
				fake('B', 'IO', 3),
				fake('C', 'RI', 3),
				fake('D', 'DE', 4),
				fake('E', 'PE', 2)
			])
		).toEqual(['E', 'B', 'C']);
	});

	it('takes a second strong reading from the same area before a weaker one elsewhere', () => {
		expect(
			highlights([fake('A', 'IO', 3), fake('B', 'IO', 3), fake('C', 'RI', 4), fake('D', 'IO', 4)])
		).toEqual(['A', 'B', 'C']);
	});

	it('spreads the weaker readings over the areas too', () => {
		expect(
			highlights([fake('A', 'IO', 2), fake('B', 'IO', 4), fake('C', 'IO', 5), fake('D', 'RI', 5)])
		).toEqual(['A', 'D', 'B']);
	});

	it('prints only the first reading of a topic that fired, in topic order', () => {
		const doc = run(
			[fake('A', 'IO', 2), fake('B', 'RI', 2), fake('C', 'DE', 3)],
			[['C', 'A', 'G']]
		);
		expect(doc.highlights.map((h) => h.ruleId)).toEqual(['B', 'C']);
		expect(idsOf(doc, 'IO')).toEqual([]);
	});

	it('prints nothing in an area that was not filled in', () => {
		const doc = buildMap({}, deps({ rules: [fake('A', 'RI', 'F'), fake('B', 'IO', 2)], copy }));
		expect(doc.areas.flatMap((a) => a.sentences)).toEqual([]);
		expect(doc.highlights).toEqual([]);
	});

	it('never highlights firm points or computed facts, and invents nothing', () => {
		expect(highlights([fake('A', 'IO', 6), fake('B', 'RI', 'F'), fake('C', 'DE', 1)])).toEqual([
			'C'
		]);
		expect(highlights([])).toEqual([]);
	});

	it('prints F sentences first, then at most three tiered ones by tier and document order', () => {
		const doc = run([
			fake('A', 'IO', 5),
			fake('B', 'IO', 4),
			fake('C', 'IO', 6),
			fake('D', 'IO', 2),
			fake('E', 'IO', 'F'),
			fake('F', 'IO', 'F')
		]);
		expect(idsOf(doc, 'IO')).toEqual(['E', 'F', 'D', 'B', 'A']);
	});
});

describe('fill', () => {
	it('fills slots and fails closed on a missing one', () => {
		expect(fill('a {n} b', { n: 2 })).toBe('a 2 b');
		expect(() => fill('{missing}', {})).toThrow();
	});
});

describe('personas (spec section 9)', () => {
	for (const persona of PERSONAS) {
		it(`${persona.name}`, () => {
			// The persona is a valid answer set: nothing in it is hidden or unknown to the catalogue.
			expect(sanitizeAnswers(catalogue, persona.answers)).toEqual(persona.answers);
			const { expected } = persona;
			const doc = build(persona.answers);
			expect(doc.highlights.map((h) => h.ruleId)).toEqual(expected.highlights);
			expect(doc.incomplete).toBe(expected.incomplete ?? false);
			for (const [id, clarity] of Object.entries(expected.clarity ?? {})) {
				expect(area(doc, id as AreaId).clarity).toBe(clarity);
			}
			expect(area(doc, 'PE').notApplicable).toBe(
				expected.retiredLine ? mapCopy.retired : undefined
			);
			if (expected.numbers)
				expect(doc.snapshot.numbers.map((n) => text(n.value))).toEqual(expected.numbers);
			const firm = doc.areas
				.flatMap((a) => a.sentences)
				.filter((s) => RULES.find((r) => r.id === s.ruleId)?.tier === 6);
			expect(firm.map((s) => s.ruleId)).toEqual(expected.firmPoints ?? []);
			for (const h of doc.highlights) expect(firm.map((s) => s.ruleId)).not.toContain(h.ruleId);
			// Every printed sentence is whole: no placeholder is left in anything printed.
			const printed = [
				...doc.areas.flatMap((a) => a.sentences.map((s) => s.text)),
				...doc.snapshot.numbers.flatMap((n) => text(n.value) ?? []),
				doc.snapshot.context,
				doc.snapshot.goals,
				doc.snapshot.reader.chosen ?? ''
			];
			expect(printed.filter((t) => /[{}]/.test(t))).toEqual([]);
		});
	}

	it('keeps the four numbers of P5 empty, the retired line and the incomplete notice', () => {
		const p5 = build(PERSONAS[4].answers);
		expect(p5.snapshot.numbers.map((n) => text(n.value))).toEqual([null, null, null, null]);
		expect(area(build(PERSONAS[6].answers), 'PE').sentences).toEqual([]);
		expect(build(PERSONAS[7].answers).incomplete).toBe(true);
	});

	it('writes the paragraphs the spec derives by hand', () => {
		// P2: SA-15 fires too, but the paragraph keeps three tiered sentences.
		expect(idsOf(build(PERSONAS[1].answers), 'SA')).toEqual(['SA-01', 'SA-05', 'SA-14', 'SA-07']);
		// P4: the firm point comes last in IO; PE-01 says all three elements are known.
		const p4 = build(PERSONAS[3].answers);
		expect(idsOf(p4, 'IO')).toEqual(['IO-01', 'IO-06']);
		expect(textOf(p4, 'PE-01')).toBe(
			'Gli elementi che descrivono la pensione futura sono tre, e sono tutti noti.'
		);
		// P6: PR-06 says what PR-02 says (one reading per topic); DE-07 too, in DE.
		expect(idsOf(build(PERSONAS[5].answers), 'PR')).toEqual(['PR-01', 'PR-02', 'PR-09', 'PR-14']);
		expect(idsOf(build(PERSONAS[5].answers), 'DE')).toEqual(['DE-01']);
		// P9.
		const p9 = build(PERSONAS[8].answers);
		expect(idsOf(p9, 'RI')).toEqual(['RI-01', 'RI-02', 'RI-03', 'RI-04', 'RI-08']);
		// PR-11 gives way to PR-10 (same topic); PR-06 prints, as PR-02 does not fire.
		expect(idsOf(p9, 'PR')).toEqual(['PR-01', 'PR-09', 'PR-10', 'PR-06']);
	});

	it('ends the paragraph of an area with a withheld answer with a note (P8)', () => {
		const doc = build(PERSONAS[7].answers);
		expect(area(doc, 'IO').note).toBe(mapCopy.withheldLine);
		expect(area(doc, 'RI').note).toBeUndefined();
		expect(area(doc, 'IO').sentences).toEqual([]);
	});

	it('reads the page-1 pieces of Marco ed Elena', () => {
		const { snapshot } = build(PERSONAS[1].answers);
		expect(snapshot.context).toBe(
			"Una coppia con due figli · la tua è l'entrata principale · lavoro dipendente · casa di proprietà con mutuo"
		);
		expect(snapshot.numbers.map((n) => text(n.value))).toEqual([
			'da +2.500 a −1.500 €',
			'tra circa 2 e 20 mesi',
			'tra 12.000 e 18.000 €',
			'tra 7.500 e 12.000 €'
		]);
		expect(snapshot.goals).toBe(
			'Il futuro dei figli, la pensione e il mutuo. Ogni mese si mettono da parte tra 100 e 500 euro.'
		);
		expect(snapshot.reader.chosen).toBe(
			'Gli investimenti di oggi sono stati scelti affidandosi alla banca.'
		);
	});

	it('words the goals line with and without a saving figure', () => {
		const goals = (i: number) => build(PERSONAS[i].answers).snapshot.goals;
		expect(goals(0)).toBe(
			'Comprare casa e la libertà finanziaria. Una quota da mettere da parte non è ancora stata fissata.'
		);
		expect(goals(2)).toBe(
			'Il futuro dei figli e la libertà finanziaria. Al momento non si riesce a mettere da parte nulla.'
		);
		expect(goals(3)).toBe(
			'La pensione, far crescere il patrimonio e proteggere il patrimonio familiare. Ogni mese si mettono da parte tra 1.000 e 2.000 euro, di cui tra 250 e 500 euro in piani di accumulo.'
		);
		// Saving amount "unknown": the goals alone. S17 never answered: nothing at all.
		expect(goals(4)).toBe('Comprare casa.');
		expect(goals(7)).toBe('');
		expect(build({ S17: { goals: ['other'] } }).snapshot.goals).toBe(
			'Obiettivi diversi da quelli elencati.'
		);
	});

	it('words the context line and drops unanswered parts', () => {
		const context = (i: number) => build(PERSONAS[i].answers).snapshot.context;
		expect(context(0)).toBe(
			'Una persona · una sola entrata in casa · lavoro dipendente · nessun immobile di proprietà'
		);
		expect(context(3)).toBe(
			'Una coppia · più entrate in casa · lavoro dipendente · casa di proprietà e altri immobili'
		);
		expect(context(6)).toBe(
			'Una persona vedova con due figli · una sola entrata in casa · in pensione · casa di proprietà'
		);
		expect(context(8)).toBe(
			"Una coppia con due figli · la tua è l'entrata principale · un'attività propria · casa di proprietà e altri immobili"
		);
		const household = (marital: string) => build({ S01: { marital } }).snapshot.context;
		expect(household('cohabiting')).toBe('Una coppia');
		expect(household('separated')).toBe('Una persona separata');
		expect(household('divorced')).toBe('Una persona divorziata');
		expect(household('withheld')).toBe('');
		const mortgage = build({ S02: { property: 'both' }, S08: { debt_types: ['mortgage'] } });
		expect(mortgage.snapshot.context).toBe('casa di proprietà con mutuo e altri immobili');
		expect(build({ S03: { work: 'other' } }).snapshot.context).toBe('');
		expect(build({}).snapshot.context).toBe('');
	});

	it('words who chose the investments and the own words of page 1', () => {
		const reader = (answers: MapAnswers) => build(answers).snapshot.reader;
		expect(reader(PERSONAS[8].answers).chosen).toBe(
			'Gli investimenti di oggi sono stati scelti con un consulente finanziario.'
		);
		expect(reader({ S12: { chosen_by: ['post_office'] } }).chosen).toBe(
			'Gli investimenti di oggi sono stati scelti con un consulente di Poste Italiane.'
		);
		// Saved before the question allowed several answers: still read.
		expect(reader({ S12: { chosen_by: 'post_office' } }).chosen).toBe(
			'Gli investimenti di oggi sono stati scelti con un consulente di Poste Italiane.'
		);
		expect(reader({ S12: { chosen_by: ['bank', 'self', 'other'] } }).chosen).toBe(
			'Gli investimenti di oggi sono stati scelti in autonomia e affidandosi alla banca.'
		);
		expect(reader({ S12: { chosen_by: ['other'] } }).chosen).toBeNull();
		expect(reader({ S18: { improve: ' Il mutuo ', question: 'Quando?' } })).toEqual({
			chosen: null,
			improve: 'Il mutuo',
			question: 'Quando?'
		});
	});

	it('lists the things to gather from the sentences that fired, in print order', () => {
		const draft = (answers: MapAnswers) =>
			buildMap(answers, deps({ rules: RULES, draft: true })).nextSteps.gather;
		// P3 has no investments, no policies, no mortgage and nothing of his own: SA-03, PR-02
		// and the like fire, but there is no statement, policy or list of assets to bring.
		expect(draft(PERSONAS[2].answers)).toEqual([
			mapCopy.gather.payslip,
			mapCopy.gather.loans,
			mapCopy.gather.inps
		]);
		// P9 has all three.
		expect(draft(PERSONAS[8].answers)).toEqual(
			expect.arrayContaining([
				mapCopy.gather.products,
				mapCopy.gather.policies,
				mapCopy.gather.assets
			])
		);
		expect(draft({ S15: { pension_fund: 'unsure_type' } })).toEqual([mapCopy.gather.fund]);
		expect(draft({ S04: { tax_reserve: 'struggle' } })).toEqual([mapCopy.gather.taxes]);
		// A withheld cover is no sign of a policy to bring; an unknown one is.
		const cover = (life_cover: string) =>
			draft({ S01: { children: 'one' }, S03: { income_role: 'sole' }, S14: { life_cover } });
		expect(cover('withheld')).not.toContain(mapCopy.gather.policies);
		expect(cover('unknown')).toContain(mapCopy.gather.policies);
	});
});

describe('page-1 numbers', () => {
	const numbers = (answers: MapAnswers) =>
		build(answers).snapshot.numbers.map((n) => text(n.value));
	const none: MapAnswers = { S08: { debt_types: ['none'] } };
	const month = (income_self: string, fixed: string) =>
		numbers({ S05: { income_self }, S06: { fixed }, ...none })[0];

	it('says what is left, what is missing, or both ends of a close month', () => {
		expect(month('5000_10000', '800_1500')).toBe('restano tra 3.500 e 9.200 €');
		expect(month('1500_2500', '800_1500')).toBe('restano fino a 1.700 €');
		expect(month('1500_2500', '2500_5000')).toBe('mancano fino a 3.500 €');
		expect(month('1500_2500', '1500_2500')).toBe('da +1.000 a −1.000 €');
	});

	it('says no instalments in words, and the cover in months', () => {
		const values = numbers({
			S05: { income_self: '2500_5000' },
			S06: { fixed: '800_1500' },
			S07: { liquidity: '10000_50000' },
			...none
		});
		expect(values[1]).toBe('tra circa 6 e 63 mesi');
		expect(values[2]).toBe('nessuna rata');
		expect(values[3]).toBe('tra 2.400 e 4.500 €');
	});

	it('is null when a value cannot be computed', () => {
		expect(
			numbers({ S05: { income_self: '1500_2500' }, S06: { fixed: 'withheld' }, ...none })
		).toEqual([null, null, 'nessuna rata', null]);
	});
});

describe('variants (first matching condition wins)', () => {
	const io = (over: MapAnswers = {}): MapAnswers => ({
		S05: { income_self: '2500_5000' },
		S06: { fixed: '800_1500', tracking: 'regular' },
		S08: { debt_types: ['none'] },
		...over
	});
	const t = (answers: MapAnswers, id: string) => textOf(build(answers), id) ?? '';

	it('IO-01: surplus, shortfall or close', () => {
		expect(t(io(), 'IO-01')).toContain('ogni mese restano tra 1.000 e 4.200 euro');
		expect(t(io({ S05: { income_self: '1500_2500' } }), 'IO-01')).toContain(
			'ogni mese restano fino a 1.700 euro'
		);
		expect(t(io({ S05: { income_self: 'lt_1500' }, S06: { fixed: '2500_5000' } }), 'IO-01')).toBe(
			'Spese fisse e rate superano le entrate: ogni mese mancano tra 1.000 e 5.000 euro.'
		);
		// At best nothing is left: "superano" would not hold.
		expect(t(io({ S05: { income_self: '1500_2500' }, S06: { fixed: '2500_5000' } }), 'IO-01')).toBe(
			'Spese fisse e rate assorbono tutte le entrate: a fine mese non resta nulla, o mancano fino a 3.500 euro.'
		);
		expect(
			t(io({ S05: { income_self: '1500_2500' }, S06: { fixed: '1500_2500' } }), 'IO-01')
		).toContain('possono restare fino a 1.000 euro oppure mancarne fino a 1.000');
	});

	it('IO-02: tracked or not', () => {
		const short = io({ S05: { income_self: '1500_2500' }, S06: { fixed: '2500_5000' } });
		expect(t(short, 'IO-02')).toMatch(/risparmi, aiuti o credito/);
		const untracked = { ...short, S06: { fixed: '2500_5000', tracking: 'no' } };
		expect(t(untracked, 'IO-02')).toMatch(/non vengono seguite con regolarità/);
		expect(t(io(), 'IO-02')).toBe('');
	});

	it('IO-03: the yearly figure, by the saving habit', () => {
		const cannot = io({ S09: { saving_habit: 'cannot' } });
		expect(t(cannot, 'IO-03')).toContain('restano tra 1.000 e 4.200 euro al mese, eppure');
		expect(t(cannot, 'IO-03')).toContain('in un anno sono tra 12.000 e 50.400 euro');
		expect(t(io({ S09: { saving_habit: 'no_quota' } }), 'IO-03')).toContain(
			'una quota da mettere da parte non è mai stata fissata'
		);
		// The margin may be zero or less: nothing is said about where it goes.
		expect(
			t(io({ S05: { income_self: '1500_2500' }, S09: { saving_habit: 'cannot' } }), 'IO-03')
		).toBe('');
	});

	it('IO-04, IO-05 and IO-08', () => {
		const married = io({ S01: { marital: 'married' }, S03: { income_role: 'sole' } });
		expect(t(married, 'IO-04')).toContain('le spese fisse, tra 800 e 1.500 euro al mese,');
		const together = io({ S01: { marital: 'cohabiting' }, S03: { income_role: 'sole' } });
		expect(t(together, 'IO-04')).toContain('In una famiglia di due adulti');
		const divorced = io({ S01: { marital: 'divorced' }, S03: { income_role: 'sole' } });
		expect(t(divorced, 'IO-04')).toBe('');
		expect(t(io({ S05: { income_self: 'unknown' } }), 'IO-05')).toContain(
			'Manca la cifra delle entrate:'
		);
		expect(t(io({ S06: { fixed: 'unknown' } }), 'IO-05')).toContain(
			'Manca la cifra delle spese fisse:'
		);
		expect(
			t(io({ S05: { income_self: 'unknown' }, S06: { fixed: 'unknown' } }), 'IO-05')
		).toContain('la cifra delle entrate e quella delle spese fisse');
		expect(t(io({ S05: { income_self: 'withheld' } }), 'IO-05')).toBe('');
		// Saving at least 1.000 a month, with at most 1.000 left on paper: the figures do not add up.
		const odd = io({
			S05: { income_self: '1500_2500' },
			S06: { fixed: '2500_5000' },
			S09: { saving_habit: 'monthly', saving_amount: '1000_2000' }
		});
		expect(t(odd, 'IO-08')).toContain('almeno 1.000 euro');
		expect(t(io({ S09: { saving_habit: 'monthly', saving_amount: '1000_2000' } }), 'IO-08')).toBe(
			''
		);
	});

	it('RI-01 and RI-02: plain, more than the reserve, a share of it', () => {
		const ri = (liquidity?: string): MapAnswers =>
			io({
				S05: { income_self: '1500_2500' },
				S07: liquidity ? { liquidity } : { emergency: 'probably_yes' }
			});
		expect(t(ri('lt_10000'), 'RI-01')).toBe(
			'I soldi disponibili subito coprono fino a circa 13 mesi di spese fisse e rate.'
		);
		expect(t(ri(), 'RI-02')).toBe(
			'Una spesa imprevista di 2.000 euro vale tra 3 e 6 settimane di entrate.'
		);
		expect(t(ri('10000_50000'), 'RI-02')).toContain('e fino al 20% di quello');
		const rich = io({ S05: { income_self: '10000_25000' }, S07: { liquidity: 'lt_10000' } });
		expect(t(rich, 'RI-02')).toBe('');
	});

	it('RI-03: who depends on the respondent, by the answer on emergencies', () => {
		const ri = (children_independent: string, emergency: string, children = 'two'): MapAnswers =>
			io({ S01: { children, children_independent }, S07: { emergency } });
		expect(t(ri('some', 'probably_no'), 'RI-03')).toMatch(
			/^Alcuni figli dipendono ancora economicamente da te, e per un imprevisto importante la liquidità probabilmente non basterebbe/
		);
		expect(t(ri('none', 'sell_investments', 'one'), 'RI-03')).toMatch(
			/^Un figlio dipende ancora economicamente da te, e per un imprevisto importante servirebbe usare o vendere/
		);
		expect(t(ri('none', 'probably_no'), 'RI-03')).toMatch(/^I figli dipendono ancora/);
		expect(t(ri('all', 'probably_no'), 'RI-03')).toBe('');
		expect(t(ri('none', 'adequate'), 'RI-03')).toBe('');
	});

	it('RI-04: enough money but not enough for an emergency, and the other way round', () => {
		const ri = (emergency: string, liquidity: string): MapAnswers =>
			io({ S07: { emergency, liquidity } });
		expect(t(ri('probably_no', 'gt_300000'), 'RI-04')).toContain(
			'eppure per un imprevisto importante'
		);
		expect(t(ri('probably_no', 'lt_10000'), 'RI-04')).toBe('');
		const heavy: MapAnswers = {
			S06: { fixed: '2500_5000' },
			S07: { emergency: 'adequate', liquidity: 'lt_10000' },
			S08: { debt_types: ['car'], instalments: '1500_2500' }
		};
		expect(t(heavy, 'RI-04')).toBe(
			'La liquidità è considerata sufficiente per un imprevisto importante; in spese fisse e rate vale fino a circa 3 mesi.'
		);
		expect(t(ri('adequate', 'gt_300000'), 'RI-04')).toBe('');
	});

	it('RI-07: names what is missing', () => {
		expect(t({ S07: { liquidity: 'unknown' } }, 'RI-07')).toContain(
			'Non è nota la cifra disponibile'
		);
		expect(t({ S07: { liquidity: '10000_50000' }, S06: { fixed: 'unknown' } }, 'RI-07')).toContain(
			'Da parte ci sono tra 10.000 e 50.000 euro;'
		);
		expect(t({ S07: { liquidity: 'withheld' } }, 'RI-07')).toBe('');
	});

	it('RI-08: with and without a known liquidity', () => {
		const tax = (tax_reserve: string, over: MapAnswers = {}): MapAnswers => ({
			...io(),
			S04: { tax_reserve },
			...over
		});
		expect(t(tax('irregular', { S07: { liquidity: 'lt_10000' } }), 'RI-08')).toMatch(
			/^Per tasse e contributi i soldi si mettono da parte, ma non con regolarità: .* che serve per gli imprevisti/
		);
		expect(t(tax('struggle'), 'RI-08')).toMatch(
			/^Per tasse e contributi è difficile mettere da parte i soldi in anticipo: .* devono arrivare dalla liquidità/
		);
		expect(t(tax('regular'), 'RI-08')).toBe('');
	});

	it('DE-01: none, all income, a share, the amount alone', () => {
		const de = (income_self: string, instalments: string, debt_types = ['car']): MapAnswers => ({
			S05: { income_self },
			S08: { debt_types, instalments }
		});
		expect(t({ S08: { debt_types: ['none'] } }, 'DE-01')).toContain('Nessuna rata in corso');
		expect(t(de('lt_1500', 'gt_2500'), 'DE-01')).toBe(
			"Un impegno a rate che vale almeno 30.000 euro l'anno: tutte le entrate indicate, o più."
		);
		expect(t(de('5000_10000', '1000_1500', ['car', 'personal_loan']), 'DE-01')).toBe(
			"Due impegni a rate che insieme valgono tra 12.000 e 18.000 euro l'anno: tra il 10% e il 30% di quello che entra."
		);
		// No share to give when the result is open at both ends: the amount alone.
		expect(t(de('lt_1500', 'lt_1000'), 'DE-01')).toBe(
			"Un impegno a rate che vale fino a 12.000 euro l'anno."
		);
		// Instalments not known: nothing to say.
		expect(t(de('lt_1500', 'unknown'), 'DE-01')).toBe('');
	});

	it('DE-07, DE-08 and DE-12', () => {
		const de = (income_role: string, life_cover = 'none'): MapAnswers => ({
			S03: { income_role },
			S08: { debt_types: ['mortgage'], instalments: 'lt_1000' },
			S14: { life_cover }
		});
		expect(t(de('sole'), 'DE-07')).toMatch(
			/^Il mutuo poggia sul tuo reddito, l'unico della famiglia/
		);
		expect(t(de('main', 'other'), 'DE-07')).toMatch(/^Il mutuo poggia soprattutto sul tuo reddito/);
		expect(t(de('shared'), 'DE-07')).toBe('');
		expect(t(de('sole', 'tcm'), 'DE-07')).toBe('');
		expect(t({ S08: { debt_types: ['car'], instalments: 'unknown' } }, 'DE-08')).toContain(
			'Non è nota la cifra totale delle rate'
		);
		const loans = (debt_types: string[]): MapAnswers => ({
			S08: { debt_types, instalments: 'lt_1000' }
		});
		expect(t(loans(['salary_loan', 'overdraft']), 'DE-12')).toMatch(/^La cessione del quinto/);
		expect(t(loans(['overdraft']), 'DE-12')).toMatch(/^Un fido non ha una rata fissa/);
		expect(t(loans(['car']), 'DE-12')).toBe('');
	});

	it('SA-01, SA-12: the saving, with and without its share of income, and the PAC share', () => {
		const sa = (over: MapAnswers): MapAnswers => ({
			S05: { income_self: '5000_10000' },
			S09: { saving_habit: 'monthly', saving_amount: '500_1000' },
			...over
		});
		expect(t(sa({}), 'SA-01')).toBe(
			'Ogni mese si mettono da parte tra 500 e 1.000 euro: tra il 5% e il 20% di quello che entra, tra 6.000 e 12.000 euro in un anno.'
		);
		expect(t(sa({ S05: { income_self: 'unknown' } }), 'SA-01')).toBe(
			'Ogni mese si mettono da parte tra 500 e 1.000 euro: tra 6.000 e 12.000 euro in un anno.'
		);
		expect(t({ S09: { saving_habit: 'cannot' } }, 'SA-01')).toContain(
			'Oggi non si riesce a mettere nulla'
		);
		expect(t({ S09: { saving_habit: 'no_quota' } }, 'SA-01')).toBe('');
		const pac = (pac_amount: string, saving_amount = '500_1000'): MapAnswers =>
			sa({ S09: { saving_habit: 'monthly', saving_amount }, S11: { pac: 'yes', pac_amount } });
		expect(t(pac('100_250'), 'SA-12')).toBe(
			'Di quello che si mette da parte ogni mese, tra il 10% e il 50% va in piani di accumulo.'
		);
		// The PAC may exceed the saving: the amount alone.
		expect(t(pac('gt_1000', 'lt_100'), 'SA-12')).toBe(
			'Nei piani di accumulo vanno almeno 1.000 euro al mese: almeno 12.000 euro in un anno.'
		);
		expect(t(sa({ S11: { pac: 'no' } }), 'SA-12')).toBe('');
	});

	it('SA-02, SA-03: name the first goal, count the goals other than "altro"', () => {
		const sa = (goals: string[], over: MapAnswers = {}): MapAnswers => ({
			S09: { saving_habit: 'no_quota' },
			S13: { purpose: 'no' },
			S17: { goals },
			...over
		});
		expect(t(sa(['freedom', 'capital']), 'SA-02')).toMatch(/^Accumulare un capitale è tra le cose/);
		expect(t(sa(['freedom']), 'SA-02')).toMatch(/^La libertà finanziaria è tra le cose/);
		expect(t(sa(['buy_home']), 'SA-02')).toBe('');
		expect(t(sa(['buy_home', 'retirement', 'other']), 'SA-03')).toContain('sono due,');
		expect(t(sa(['other']), 'SA-03')).toContain("C'è una cosa");
		expect(t(sa(['buy_home'], { S13: { purpose: 'yes' } }), 'SA-03')).toBe('');
		// No saving and no investments: there are no savings to give a purpose to.
		const none = { S09: { saving_habit: 'cannot' }, S10: { investments: 'no' } };
		expect(t(sa(['buy_home'], none), 'SA-03')).toBe('');
		// Goals only vague: SA-15, a weaker reading, instead of SA-03.
		const vague = sa(['buy_home', 'retirement'], { S13: { purpose: 'vague' } });
		expect(t(vague, 'SA-03')).toBe('');
		expect(t(vague, 'SA-15')).toContain('sono due, e gli obiettivi dei risparmi ci sono');
	});

	it('SA-05, SA-08, SA-13, SA-14', () => {
		const costs = (costs_returns: string): MapAnswers => ({ S12: { costs_returns } });
		expect(t(costs('neither'), 'SA-05')).toMatch(/^Degli investimenti non si conoscono né i costi/);
		expect(t(costs('returns_only'), 'SA-05')).toMatch(/si conosce il rendimento ma non il costo/);
		expect(t(costs('costs_only'), 'SA-05')).toMatch(/si conosce il costo ma non il rendimento/);
		expect(t(costs('both'), 'SA-05')).toBe('');
		expect(t({ S10: { holdings: ['etf', 'funds', 'shares', 'crypto'] } }, 'SA-08')).toContain(
			'in quattro forme diverse'
		);
		expect(t({ S10: { holdings: ['etf', 'funds', 'property', 'other'] } }, 'SA-08')).toBe('');
		expect(t({ S12: { last_review: '5_10' } }, 'SA-13')).toContain('tra cinque e dieci anni fa');
		expect(t({ S12: { last_review: 'over_10' } }, 'SA-13')).toContain('più di dieci anni fa');
		expect(t({ S12: { last_review: 'unknown' } }, 'SA-13')).toMatch(/^Non è noto quando/);
		expect(t({ S12: { last_review: '3_5' } }, 'SA-13')).toBe('');
		const wealth = (wealth_estimate: string, property = 'main_home', investments = 'no') =>
			t({ S02: { property }, S10: { investments }, S16: { wealth_estimate } }, 'SA-14');
		expect(wealth('no')).not.toBe('');
		expect(wealth('unsure')).toBe('');
		// With one kind of asset, its value is the total: "more or less" is enough.
		expect(wealth('roughly')).toBe('');
		expect(wealth('roughly', 'main_home', 'yes')).not.toBe('');
		// Nothing to add up.
		expect(wealth('no', 'none')).toBe('');
	});

	it('SA-09: other property, business shares or an entrepreneur', () => {
		// The savings area must have some answer, or it prints nothing.
		const sa: MapAnswers = { S13: { purpose: 'yes' } };
		expect(t({ ...sa, S02: { property: 'other_only' } }, 'SA-09')).not.toBe('');
		expect(t({ ...sa, S10: { holdings: ['business_stakes'] } }, 'SA-09')).not.toBe('');
		expect(t({ ...sa, S03: { work: 'entrepreneur' } }, 'SA-09')).not.toBe('');
		expect(t({ ...sa, S02: { property: 'main_home' } }, 'SA-09')).toBe('');
		expect(t({ S02: { property: 'other_only' } }, 'SA-09')).toBe('');
	});

	it('PR-01: four variants', () => {
		// The protection area must have some answer, or it prints nothing.
		const covered: MapAnswers = { S14: { life_cover: 'tcm' } };
		const pr = (liquidity?: string, fixed = '800_1500'): MapAnswers =>
			io({ ...covered, S06: { fixed }, ...(liquidity ? { S07: { liquidity } } : {}) });
		const heavy = io({
			...covered,
			S06: { fixed: '2500_5000' },
			S07: { liquidity: 'lt_10000' },
			S08: { debt_types: ['car'], instalments: '1000_1500' }
		});
		expect(t(heavy, 'PR-01')).toContain('ne mancherebbero tra 500 e 19.500 euro');
		expect(t(pr('gt_300000'), 'PR-01')).toContain('la liquidità li copre per intero');
		expect(t(pr('lt_10000'), 'PR-01')).toContain('può bastare oppure no');
		expect(t(pr(), 'PR-01')).toBe('Tre mesi di spese fisse e rate valgono tra 2.400 e 4.500 euro.');
	});

	it('PR-02 and PR-03: PR-03 gives way to PR-02', () => {
		const pr = (
			income_role: string,
			life_cover: string,
			children_independent = 'none'
		): MapAnswers => ({
			S01: { children: 'three_plus', children_independent },
			S03: { income_role },
			S14: { life_cover }
		});
		expect(t(pr('sole', 'none'), 'PR-02')).toMatch(
			/^Il tuo reddito è l'unica entrata di una famiglia con tre o più figli/
		);
		expect(t(pr('main', 'other'), 'PR-02')).toMatch(/^Il tuo reddito è la fonte principale/);
		expect(t(pr('shared', 'none'), 'PR-02')).toBe('');
		expect(t(pr('sole', 'none'), 'PR-03')).toBe('');
		expect(t(pr('shared', 'none'), 'PR-03')).toMatch(
			/^I figli dipendono ancora economicamente da te, e non c'è nessuna tutela/
		);
		expect(t(pr('shared', 'other'), 'PR-03')).toBe('');
		expect(t(pr('shared', 'none', 'all'), 'PR-03')).toBe('');
	});

	it('PR-07 and PR-13: join the assets with commas and a final e', () => {
		const assets: MapAnswers = {
			S02: { property: 'both' },
			S10: { investments: 'yes', holdings: ['business_stakes'] },
			S14: { life_cover: 'tcm' }
		};
		expect(t({ ...assets, S17: { goals: ['protect'] } }, 'PR-07')).toContain(
			"riguarda insieme la casa, gli altri immobili, gli investimenti, l'attività e le coperture."
		);
		expect(
			t(
				{ S02: { property: 'main_home' }, S16: { heirs: 'all' }, S17: { goals: ['protect'] } },
				'PR-07'
			)
		).toMatch(/riguarda la casa\.$/);
		expect(t({ ...assets, S16: { heirs: 'never_looked' } }, 'PR-13')).toMatch(
			/a chi andrebbero la casa, gli altri immobili, gli investimenti e l'attività\.$/
		);
		expect(t({ S02: { property: 'main_home' }, S16: { heirs: 'not_sure' } }, 'PR-13')).toMatch(
			/a chi andrebbe la casa\.$/
		);
		expect(t({ ...assets, S16: { heirs: 'all' } }, 'PR-13')).toBe('');
		expect(t({ S02: { property: 'none' }, S16: { heirs: 'not_sure' } }, 'PR-13')).toBe('');
	});

	it('PR-11 and PR-12: the goal, and what the law decides', () => {
		const pr = (goals: string[], succession: string): MapAnswers => ({
			S17: { goals },
			S16: { succession }
		});
		expect(t(pr(['protect', 'handover'], 'thought'), 'PR-11')).toMatch(
			/^Il passaggio generazionale è tra le cose che contano per voi; a come trasferire .* si è pensato/
		);
		expect(t(pr(['handover'], 'no'), 'PR-11')).toMatch(
			/^Il passaggio generazionale è tra le cose .* non è ancora stato affrontato\.$/
		);
		// Protecting the family's wealth is not the same thing as passing it on (PR-07 reads it).
		expect(t(pr(['protect'], 'no'), 'PR-11')).toBe('');
		expect(t(pr(['handover'], 'planned'), 'PR-11')).toBe('');
		expect(t({ S16: { succession_reason: 'by_law' } }, 'PR-12')).toMatch(/la legge regola da sé/);
		const small = (wealth_estimate: string, property = 'main_home'): MapAnswers => ({
			S02: { property },
			S16: { succession_reason: 'too_small', wealth_estimate }
		});
		expect(t(small('roughly'), 'PR-12')).toMatch(/troppo piccolo/);
		expect(t(small('precise'), 'PR-12')).toBe('');
		// With nothing of one's own, "too small" is no reading at all.
		expect(t(small('roughly', 'none'), 'PR-12')).toBe('');
	});

	it('PE-01: all known, none known, some known', () => {
		const pe = (s15: Record<string, string>, work = 'employee'): MapAnswers => ({
			S03: { work },
			S15: s15
		});
		expect(t(pe({ tfr: 'fund', pension_fund: 'open', pension_sim: 'knows' }), 'PE-01')).toBe(
			'Gli elementi che descrivono la pensione futura sono tre, e sono tutti noti.'
		);
		expect(t(pe({ pension_fund: 'no', pension_sim: 'knows' }, 'professional'), 'PE-01')).toBe(
			'Gli elementi che descrivono la pensione futura sono due, e sono tutti noti.'
		);
		expect(
			t(pe({ tfr: 'unknown', pension_fund: 'unsure_type', pension_sim: 'never' }), 'PE-01')
		).toContain(
			"(dove va il TFR, se c'è un fondo e di che tipo, una simulazione della pensione) non ne è noto nessuno"
		);
		expect(
			t(pe({ tfr: 'company', pension_fund: 'unsure_type', pension_sim: 'knows' }), 'PE-01')
		).toContain('ne sono noti due: finché mancano gli altri');
		expect(t({}, 'PE-01')).toBe('');
		// Withheld answers say nothing about what the person knows.
		const declined = { tfr: 'withheld', pension_fund: 'withheld', pension_sim: 'withheld' };
		expect(t(pe(declined), 'PE-01')).toBe('');
	});

	it('PE-02, PE-03, PE-04, PE-05, PE-07', () => {
		const pe = (goals: string[], pension_sim: string): MapAnswers => ({
			S17: { goals },
			S15: { pension_sim }
		});
		expect(t(pe(['extra_income', 'retirement'], 'forgot'), 'PE-02')).toMatch(
			/^La pensione è tra le cose .* ma il risultato non è rimasto\.$/
		);
		expect(t(pe(['extra_income'], 'where_start'), 'PE-02')).toMatch(
			/^Una rendita integrativa è tra le cose .* non è mai stata fatta\.$/
		);
		expect(t(pe(['retirement'], 'knows'), 'PE-02')).toBe('');
		expect(t({ S01: { age_band: '46_55' }, S15: { pension_sim: 'never' } }, 'PE-03')).toMatch(
			/^Tra i 46 e i 55 anni la pensione/
		);
		expect(t({ S01: { age_band: '36_45' }, S15: { pension_sim: 'never' } }, 'PE-03')).toBe('');
		expect(t({ S15: { tfr: 'unknown' } }, 'PE-04')).not.toBe('');
		expect(t({ S03: { work: 'professional' }, S15: { pension_sim: 'never' } }, 'PE-05')).not.toBe(
			''
		);
		expect(t({ S03: { work: 'professional' }, S15: { pension_sim: 'forgot' } }, 'PE-05')).toBe('');
		expect(t({ S15: { pension_fund: 'unsure_type' } }, 'PE-07')).toMatch(/^C'è un fondo pensione/);
	});
});

describe('self-employed track rules', () => {
	const fires = (answers: MapAnswers, id: string) =>
		build(answers)
			.areas.flatMap((a) => a.sentences)
			.some((x) => x.ruleId === id);

	it('IO-07: accounts shared, with an income or fixed spending band', () => {
		const io = (separate_accounts: string, over: MapAnswers = {}): MapAnswers => ({
			S04: { separate_accounts },
			S05: { income_self: '2500_5000' },
			...over
		});
		expect(fires(io('no'), 'IO-07')).toBe(true);
		expect(fires(io('partly'), 'IO-07')).toBe(true);
		expect(fires(io('yes'), 'IO-07')).toBe(false);
		expect(fires(io('no', { S05: { income_self: 'unknown' } }), 'IO-07')).toBe(false);
		expect(fires(io('no', { S05: {}, S06: { fixed: '800_1500' } }), 'IO-07')).toBe(true);
	});

	it('PR-06 and PE-05 follow the self-employed track only', () => {
		const work = (w: string): MapAnswers => ({
			S03: { work: w },
			S14: { life_cover: 'tcm' },
			S15: { pension_sim: 'never' }
		});
		for (const id of ['PR-06', 'PE-05']) {
			expect(fires(work('professional'), id)).toBe(true);
			expect(fires(work('employee'), id)).toBe(false);
		}
		expect(fires({ ...work('professional'), S14: { life_cover: 'both' } }, 'PR-06')).toBe(false);
	});

	it('PR-09: the business slows or stops, with a cover in months', () => {
		const pr = (owner_dependency: string, over: MapAnswers = {}): MapAnswers => ({
			S04: { owner_dependency },
			S06: { fixed: '800_1500' },
			S07: { liquidity: '10000_50000' },
			S08: { debt_types: ['none'] },
			...over
		});
		expect(textOf(build(pr('stops')), 'PR-09')).toBe(
			"Se tu non potessi lavorare per qualche mese, l'attività si fermerebbe, e con lei la tua entrata: nel frattempo spese fisse e rate conterebbero sulla liquidità, che ne copre tra circa 6 e 63 mesi."
		);
		expect(textOf(build(pr('slows')), 'PR-09')).toContain(
			"l'attività andrebbe avanti, ma con meno entrate:"
		);
		expect(fires(pr('continues'), 'PR-09')).toBe(false);
		// Cover not computable: no fixed spending.
		expect(fires(pr('stops', { S06: {} }), 'PR-09')).toBe(false);
	});

	it('PR-10: handing over a business that stops without its owner', () => {
		const pr = (goals: string[], owner_dependency: string): MapAnswers => ({
			S04: { owner_dependency },
			S17: { goals }
		});
		expect(fires(pr(['handover'], 'stops'), 'PR-10')).toBe(true);
		expect(fires(pr(['handover'], 'slows'), 'PR-10')).toBe(false);
		expect(fires(pr(['protect'], 'stops'), 'PR-10')).toBe(false);
	});

	it('PR-14: children without a pension position, with the children goal', () => {
		const pr = (children_pension: string, goals = ['children']): MapAnswers => ({
			S15: { children_pension },
			S17: { goals }
		});
		expect(fires(pr('neither'), 'PR-14')).toBe(true);
		expect(fires(pr('both'), 'PR-14')).toBe(false);
		expect(fires(pr('neither', ['freedom']), 'PR-14')).toBe(false);
	});
});

describe('map links and figures', () => {
	const rule = (id: string) => RULES.find((r) => r.id === id)!;

	it('links a reading to the places its facts sit, never to its own area', () => {
		// RI-05 reads the emergency answer (RI), the saving habit (SA) and the outgoings (IO, DE).
		expect(linksOf(rule('RI-05'))).toEqual(['SA', 'IO', 'DE']);
		// coverMonths is the liquidity over fixed spending and instalments.
		expect(linksOf(rule('RI-01'))).toEqual(['IO', 'DE']);
		expect(linksOf(rule('DE-06'))).toEqual(['SA']);
		expect(linksOf(rule('SA-02'))).toEqual(['OB']);
		expect(linksOf(rule('PR-02'))).toEqual(['VOI']);
	});

	it('splits a number at its first digit or sign, and joins it back as the spec words it', () => {
		for (const [value, lead, figure] of [
			['restano tra 300 e 1.900 €', 'restano tra', '300 e 1.900 €'],
			['da +400 a −700 €', 'da', '+400 a −700 €'],
			['nessuna riserva', '', 'nessuna riserva']
		]) {
			expect(splitFigure(value)).toEqual({ lead, figure });
			expect(figureText(splitFigure(value))).toBe(value);
		}
	});
});
