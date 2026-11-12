import { assessAreas, AREA_IDS } from './clarity.ts';
import { buildFacts, isBusiness, negate } from './facts.ts';
import type { BandSets, MapAnswers } from './facts.ts';
import { hasAssets, RULES_VERSION } from './rules.ts';
import type {
	AreaBlock,
	AreaId,
	Facts,
	Fired,
	Figure,
	Known,
	MapDocument,
	NodeId,
	Reading,
	Rule,
	RuleCopy,
	Slots,
	Wording
} from './types.ts';
import { makeWording, upperFirst } from './wording.ts';
import type { WordingCopy } from './wording.ts';

/** All Italian copy the engine prints; the module `$lib/content/map.it` holds the real text. */
export interface MapCopy {
	rules: Record<string, RuleCopy>;
	wording: WordingCopy;
	areaTitles: Record<AreaId, string>;
	/** Printed instead of the clarity state of the pension area for a retired person. */
	retired: string;
	/** Closes the paragraph of an area when one of its answers was withheld. */
	withheldLine: string;
	/** "Cosa può servire avere sotto mano", keyed by item id. */
	gather: Record<string, string>;
	/** The four cells of "I numeri della mappa". */
	numbers: {
		labels: [margin: string, cover: string, instalments: string, threeMonths: string];
		/** `{value}` is the euro wording with "€"; `close` reads `margin_hi` and `gap_hi`. */
		margin: { surplus: string; shortfall: string; close: string };
		noInstalments: string;
	};
	snapshot: {
		context: {
			separator: string;
			household: Record<string, string>;
			/** Appended to the household line when there are children; `{children_phrase}`. */
			withChildren: string;
			incomes: Record<string, string>;
			work: Record<string, string>;
			/** `{mortgage}` is replaced by `withMortgage` when the home carries a mortgage. */
			housing: Record<string, string>;
			withMortgage: string;
		};
		goals: {
			/** Printed when `other` is the only goal chosen. */
			onlyOther: string;
			/** The monthly saving sentence; `pac` is appended when the PAC share is known. */
			saving: { amount: string; pac: string; cannot: string; no_quota: string };
		};
		/**
		 * "Gli investimenti di oggi sono stati scelti {how}.": `how` lists the ways named in
		 * `chosen_by` (several are allowed); `other` has no wording and is left out.
		 */
		chosen: { sentence: string; how: Record<string, string> };
	};
}

export interface MapDeps {
	bands: BandSets;
	rules: Rule[];
	/** Groups of rule ids that say the same thing; see `TOPICS` in `rules.ts`. */
	topics: string[][];
	copy: MapCopy;
	now: Date;
	/** Draft documents also show unapproved rules. */
	draft: boolean;
	catalogue: string;
}

const MAX_QUESTION = 300;
const MAX_HIGHLIGHTS = 3;
const MAX_TIERED = 3;

/** There are investments or savings products whose statement could be gathered. */
const hasProducts = (f: Facts) =>
	isIn(val(f.investments), ['yes', 'mostly_account']) ||
	(f.holdingsCount ?? 0) > 0 ||
	val(f.pac) === 'yes';

/** There are policies to gather: some cover, an unknown one, or a mortgage that may carry one. */
const mayHavePolicies = (f: Facts) =>
	f.life_cover.status === 'unknown' ||
	(f.life_cover.status === 'known' && val(f.life_cover) !== 'none') ||
	(val(f.debt_types)?.includes('mortgage') ?? false);

/**
 * Items to gather, in print order: the rules that trigger each and, where a rule alone does not
 * say the item exists, what the answers must show (spec section 8).
 */
export const GATHER: [id: string, rules: string[], exists?: (f: Facts) => boolean][] = [
	['payslip', ['IO-05', 'IO-08', 'PE-04', 'DE-12']],
	['statement', ['IO-02', 'IO-03', 'IO-08', 'RI-07']],
	['loans', ['DE-06', 'DE-07', 'DE-08', 'DE-12']],
	['products', ['SA-03', 'SA-05', 'SA-07', 'SA-08', 'SA-13', 'SA-15'], hasProducts],
	['policies', ['DE-07', 'PR-02', 'PR-03', 'PR-06', 'PR-08'], mayHavePolicies],
	['inps', ['PE-02', 'PE-03', 'PE-05']],
	['fund', ['PE-07']],
	['taxes', ['RI-08']],
	['assets', ['SA-14', 'PR-11', 'PR-12', 'PR-13'], hasAssets]
];

/** Fills `{slot}` placeholders; a missing one is a bug, so it fails closed. */
export function fill(template: string, slots: Slots): string {
	return template.replace(/\{(\w+)\}/g, (_, name: string) => {
		const value = slots[name];
		if (value === undefined) throw new Error(`No slot "${name}" for ${JSON.stringify(slots)}`);
		return String(value);
	});
}

/**
 * Where each fact sits on the map: answers by the schede that feed each area (spec section 5),
 * S01-S03 at the centre, S17 in the goals; computed facts by their inputs. S18 sits nowhere.
 */
const NODES_OF: Record<keyof Facts, NodeId[]> = {
	age_band: ['VOI'],
	marital: ['VOI'],
	children_answer: ['VOI'],
	children_independent: ['VOI'],
	property: ['VOI'],
	work: ['VOI'],
	income_role: ['VOI'],
	separate_accounts: ['IO'],
	tax_reserve: ['RI'],
	owner_dependency: ['PR'],
	income: ['IO'],
	fixed: ['IO'],
	tracking: ['IO'],
	liquidity: ['RI'],
	emergency: ['RI'],
	debt_types: ['DE'],
	instalments: ['DE'],
	saving_habit: ['SA'],
	saving_amount: ['SA'],
	investments: ['SA'],
	holdings: ['SA'],
	pac: ['SA'],
	pac_amount: ['SA'],
	chosen_by: ['SA'],
	costs_returns: ['SA'],
	last_review: ['SA'],
	purpose: ['SA'],
	life_cover: ['PR'],
	pension_fund: ['PE'],
	tfr: ['PE'],
	children_pension: ['PR'],
	pension_sim: ['PE'],
	wealth_estimate: ['SA'],
	heirs: ['PR'],
	succession: ['PR'],
	succession_reason: ['PR'],
	goals: ['OB'],
	improve: [],
	question: [],
	outgoings: ['IO', 'DE'],
	margin: ['IO', 'DE'],
	marginYear: ['IO', 'DE'],
	coverMonths: ['RI', 'IO', 'DE'],
	// Picks which expense is the reference; the reading says nothing about income.
	shockAmount: [],
	shockWeeks: ['IO'],
	shockShare: ['RI'],
	instalmentsYear: ['DE'],
	instalmentShare: ['DE', 'IO'],
	threeMonths: ['IO', 'DE'],
	missingThree: ['IO', 'DE', 'RI'],
	savingYear: ['SA'],
	savingShare: ['SA', 'IO'],
	pacShare: ['SA'],
	pacYear: ['SA'],
	children: ['VOI'],
	dependentChildren: ['VOI'],
	debtCount: ['DE'],
	holdingsCount: ['SA'],
	pensionKnown: ['PE'],
	pensionTotal: ['PE']
};

/** The places a rule's reading connects its own area to, in map order. */
export function linksOf(rule: Pick<Rule, 'area' | 'reads'>): NodeId[] {
	const touched = new Set(rule.reads.flatMap((fact) => NODES_OF[fact]));
	touched.delete(rule.area);
	return [...touched];
}

/** Splits a printed number at its first digit or sign; with no digit, all of it is the figure. */
export function splitFigure(value: string): Figure {
	const at = value.search(/[+−-]?\d/);
	return at <= 0
		? { lead: '', figure: value }
		: { lead: value.slice(0, at).trim(), figure: value.slice(at) };
}

/** The number as one line of text, as the spec words it. */
export const figureText = ({ lead, figure }: Figure) => (lead ? `${lead} ${figure}` : figure);

const val = <T>(k: Known<T>): T | undefined => (k.status === 'known' ? k.value : undefined);

const isIn = (v: string | undefined, options: string[]) => v !== undefined && options.includes(v);

interface Match {
	rule: Rule;
	fired: Fired;
}

function reading({ rule, fired }: Match, copy: MapCopy): Reading {
	const entry = copy.rules[rule.id];
	if (!entry) throw new Error(`No copy for rule ${rule.id}`);
	const template = typeof entry.text === 'string' ? entry.text : entry.text[fired.variant ?? ''];
	if (template === undefined) throw new Error(`No variant "${fired.variant}" for ${rule.id}`);
	return {
		ruleId: rule.id,
		area: rule.area,
		lens: rule.lens,
		text: fill(template, fired.slots),
		links: linksOf(rule),
		...(entry.question ? { question: entry.question } : {})
	};
}

/** By tier, then by document order (the order of the rule table). */
const byTier = (a: { m: Match; order: number }, b: { m: Match; order: number }) =>
	Number(a.m.rule.tier) - Number(b.m.rule.tier) || a.order - b.order;

/** Tiers 1-3 (difficulty, people, goals) come before tiers 4-5 (missing data, other readings). */
const STRONG_TIER = 3;

/**
 * Highlight selection of section 6: tiers 1-5, strong ones first; within the strong ones and
 * then within the others, one per area first, then the rest in order, up to three.
 */
function selectHighlights(matches: Match[]): Match[] {
	const ranked = matches
		.map((m, order) => ({ m, order }))
		.filter(({ m }) => typeof m.rule.tier === 'number' && m.rule.tier <= 5)
		.sort(byTier)
		.map(({ m }) => m);
	const strong = ranked.filter((m) => Number(m.rule.tier) <= STRONG_TIER);
	const weak = ranked.filter((m) => Number(m.rule.tier) > STRONG_TIER);
	const picked: Match[] = [];
	const areas = new Set<AreaId>();
	for (const group of [strong, weak]) {
		for (const m of group) {
			if (picked.length < MAX_HIGHLIGHTS && !areas.has(m.rule.area)) {
				picked.push(m);
				areas.add(m.rule.area);
			}
		}
		for (const m of group) {
			if (picked.length < MAX_HIGHLIGHTS && !picked.includes(m)) picked.push(m);
		}
	}
	return picked;
}

/** Of each topic (rules that say the same thing), only the first that fired, in topic order. */
function onePerTopic(matches: Match[], topics: string[][]): Match[] {
	const fired = new Set(matches.map((m) => m.rule.id));
	const dropped = new Set(topics.flatMap((topic) => topic.filter((id) => fired.has(id)).slice(1)));
	return matches.filter((m) => !dropped.has(m.rule.id));
}

/** The paragraph of an area: its F sentences in document order, then up to three tiered ones. */
function buildAreas(
	assessed: ReturnType<typeof assessAreas>,
	matches: Match[],
	copy: MapCopy
): AreaBlock[] {
	return AREA_IDS.map((id) => {
		const own = matches.filter((m) => m.rule.area === id);
		const computed = own.filter((m) => m.rule.tier === 'F');
		const tiered = own
			.filter((m) => m.rule.tier !== 'F')
			.map((m, order) => ({ m, order }))
			.sort(byTier)
			.slice(0, MAX_TIERED)
			.map(({ m }) => m);
		const area = assessed[id];
		return {
			id,
			title: copy.areaTitles[id],
			clarity: area.clarity,
			...(area.notApplicable ? { notApplicable: copy.retired } : {}),
			sentences: [...computed, ...tiered].map((m) => reading(m, copy)),
			...(area.withheld ? { note: copy.withheldLine } : {})
		};
	});
}

/** "I numeri della mappa": four computed values, `null` when one cannot be computed. */
function buildNumbers(facts: Facts, copy: MapCopy, w: Wording): MapDocument['snapshot']['numbers'] {
	const { labels, margin, noInstalments } = copy.numbers;
	const m = facts.margin;
	const cell = (template: string, value: string | null) =>
		value === null ? null : fill(template, { value });
	let atMonthEnd: string | null = null;
	if (m && m.lo >= 0) atMonthEnd = cell(margin.surplus, w.eurShort(m));
	else if (m && m.hi <= 0) atMonthEnd = cell(margin.shortfall, w.eurShort(negate(m)));
	else if (m && Number.isFinite(m.hi) && Number.isFinite(m.lo)) {
		atMonthEnd = fill(margin.close, { margin_hi: w.number(m.hi), gap_hi: w.number(-m.lo) });
	}
	const debts = val(facts.debt_types);
	const none = debts?.length === 1 && debts[0] === 'none';
	const cells: [string, string | null][] = [
		[labels[0], atMonthEnd],
		[labels[1], w.months(facts.coverMonths)],
		[labels[2], none ? noInstalments : w.eurShort(facts.instalmentsYear)],
		[labels[3], w.eurShort(facts.threeMonths)]
	];
	return cells.map(([label, value]) => ({
		label,
		value: value === null ? null : splitFigure(value)
	}));
}

/** "Il punto di partenza": household, incomes, work and housing; parts with no answer are left out. */
function buildContext(facts: Facts, copy: MapCopy, w: Wording): string {
	const c = copy.snapshot.context;
	const pick = (table: Record<string, string>, k: Known<string>) => {
		const v = val(k);
		return v === undefined || table[v] === undefined ? [] : [table[v]];
	};
	const household = pick(c.household, facts.marital).map(
		(line) =>
			line +
			(facts.children
				? fill(c.withChildren, { children_phrase: w.phrase('children', facts.children) })
				: '')
	);
	const mortgage =
		isIn(val(facts.property), ['main_home', 'both']) && val(facts.debt_types)?.includes('mortgage');
	const housing = pick(c.housing, facts.property).map((line) =>
		fill(line, { mortgage: mortgage ? c.withMortgage : '' })
	);
	return [household, pick(c.incomes, facts.income_role), pick(c.work, facts.work), housing]
		.flat()
		.join(c.separator);
}

/** How today's investments were chosen, in the order of the question; null when nothing to say. */
function buildChosen(facts: Facts, copy: MapCopy, w: Wording): string | undefined {
	const c = copy.snapshot.chosen;
	const how = Object.keys(c.how)
		.filter((k) => val(facts.chosen_by)?.includes(k))
		.map((k) => c.how[k]);
	return how.length > 0 ? fill(c.sentence, { how: w.list(how) }) : undefined;
}

/** "Le cose che contano per voi": the goals, then the monthly saving when it is known. */
function buildGoals(facts: Facts, copy: MapCopy, w: Wording): string {
	const g = copy.snapshot.goals;
	const goals = val(facts.goals);
	if (!goals) return '';
	const names = goals.filter((x) => x !== 'other').map((x) => w.phrase('goal', x));
	const list = names.length > 0 ? `${upperFirst(w.list(names))}.` : g.onlyOther;
	const habit = val(facts.saving_habit);
	const saving = val(facts.saving_amount);
	const pac = val(facts.pac_amount);
	const inPac =
		pac && facts.pacShare && facts.pacShare.hi <= 100
			? fill(g.saving.pac, { pac_eur: w.eur(pac) ?? '' })
			: '';
	let sentence: string | undefined;
	if (saving) sentence = fill(g.saving.amount, { saving_eur: w.eur(saving) ?? '' }) + inPac;
	else if (habit === 'cannot' || habit === 'no_quota') sentence = g.saving[habit];
	return sentence ? `${list} ${sentence}.` : list;
}

/** Schede that are shown to this respondent (S04 and S12 are conditional), S01-S18. */
function visibleSheets(facts: Facts): string[] {
	return Array.from({ length: 18 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`).filter(
		(id) =>
			(id !== 'S04' || isBusiness(facts)) &&
			(id !== 'S12' || isIn(val(facts.investments), ['yes', 'mostly_account']))
	);
}

/** Fewer than half of the visible schede have any answer. */
function isIncomplete(answers: MapAnswers, facts: Facts): boolean {
	const visible = visibleSheets(facts);
	const answered = visible.filter((id) => Object.keys(answers[id] ?? {}).length > 0).length;
	return answered * 2 < visible.length;
}

/**
 * Turns survey answers into everything the PDF prints. Pure: bands, rules, copy and the clock
 * are injected. Unapproved rules take part only in draft documents.
 */
export function buildMap(answers: MapAnswers, deps: MapDeps): MapDocument {
	const { copy } = deps;
	const w = makeWording(copy.wording);
	const facts = buildFacts(answers, deps.bands);
	const assessed = assessAreas(facts);
	// An area left blank prints nothing, not even what other schede let the map compute.
	const fired: Match[] = deps.rules
		.filter((rule) => deps.draft || rule.approved)
		.filter((rule) => assessed[rule.area].clarity !== 'non_compilata')
		.flatMap((rule) => {
			const fired = rule.when(facts, w);
			return fired ? [{ rule, fired }] : [];
		});
	const matches = onePerTopic(fired, deps.topics);

	const highlights = selectHighlights(matches).map((m) => reading(m, copy));
	const question = val(facts.question)?.slice(0, MAX_QUESTION);
	const improve = val(facts.improve)?.slice(0, MAX_QUESTION);
	const chosen = buildChosen(facts, copy, w);
	const printed = new Set(matches.map((m) => m.rule.id));

	return {
		draft: deps.draft,
		generatedOn: deps.now.toISOString().slice(0, 10),
		versions: { catalogue: deps.catalogue, rules: RULES_VERSION },
		incomplete: isIncomplete(answers, facts),
		snapshot: {
			context: buildContext(facts, copy, w),
			numbers: buildNumbers(facts, copy, w),
			goals: buildGoals(facts, copy, w),
			reader: { chosen: chosen ?? null, improve: improve ?? null, question: question ?? null }
		},
		areas: buildAreas(assessed, matches, copy),
		highlights,
		nextSteps: {
			questions: [...highlights.flatMap((h) => h.question ?? []), ...(question ? [question] : [])],
			gather: GATHER.filter(
				([, ids, exists]) => ids.some((id) => printed.has(id)) && (exists?.(facts) ?? true)
			).map(([id]) => copy.gather[id])
		}
	};
}
