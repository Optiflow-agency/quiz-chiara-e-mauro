import { mapCopy } from '../../content/map.it.ts';
import { fill, linksOf, splitFigure } from '../../map/compose.ts';
import { RULES, RULES_VERSION } from '../../map/rules.ts';
import { SAMPLE_SLOTS } from '../../map/sample-slots.ts';
import type { AreaBlock, MapDocument, Reading } from '../../map/types.ts';
import { makeWording } from '../../map/wording.ts';

/**
 * Test document: the longest realistic content the real copy can produce, used to check that the
 * layout always fits four pages with nothing cut. Per area: its five longest sentences (more than
 * the spec allows at once) and the withheld note; the three longest highlights; the longest
 * context, goals and reader lines; a 300-character question and a 150-character aspect to improve. Not used outside tests.
 */

const w = makeWording(mapCopy.wording);
const AREAS = ['IO', 'RI', 'DE', 'SA', 'PR', 'PE'] as const;
const SENTENCES_PER_AREA = 5;

const longest = (items: string[]) => items.reduce((a, b) => (b.length > a.length ? b : a));
const byLength = <T>(items: T[], key: (item: T) => string) =>
	[...items].sort((a, b) => key(b).length - key(a).length);

function reading(ruleId: string): Reading {
	const rule = RULES.find((r) => r.id === ruleId)!;
	const { text, question } = mapCopy.rules[ruleId];
	const variants = typeof text === 'string' ? [text] : Object.values(text);
	return {
		ruleId,
		area: rule.area,
		lens: rule.lens,
		text: longest(variants.map((v) => fill(v, SAMPLE_SLOTS))),
		links: linksOf(rule),
		question
	};
}

function area(id: (typeof AREAS)[number]): AreaBlock {
	const sentences = byLength(
		RULES.filter((r) => r.area === id).map((r) => reading(r.id)),
		(r) => r.text
	).slice(0, SENTENCES_PER_AREA);
	return {
		id,
		title: mapCopy.areaTitles[id],
		clarity: 'da_ricostruire',
		sentences,
		note: mapCopy.withheldLine
	};
}

const values = (o: Record<string, string>) => byLength(Object.values(o), (s) => s);

export function buildMaxMap(): MapDocument {
	const { context, goals } = mapCopy.snapshot;
	const highlights = byLength(
		RULES.filter((r) => typeof r.tier === 'number' && r.tier <= 5).map((r) => reading(r.id)),
		(r) => r.text
	).slice(0, 3);
	const own = (lead: string) =>
		`${lead} Posso fare una domanda lunga e scritta con parole mie? `
			.repeat(6)
			.slice(0, 300)
			.trim();
	const question = own('');
	const eur = w.eurShort({ lo: 12000, hi: 25000 }) ?? '';
	const names = values(mapCopy.wording.phrases.goal).slice(0, 4);
	return {
		draft: false,
		generatedOn: '2026-10-03',
		versions: { catalogue: '2026-10-02-map-draft', rules: RULES_VERSION },
		incomplete: true,
		snapshot: {
			context: [
				longest(Object.values(context.household)) +
					fill(context.withChildren, {
						children_phrase: longest(Object.values(mapCopy.wording.phrases.children))
					}),
				longest(Object.values(context.incomes)),
				longest(Object.values(context.work)),
				fill(longest(Object.values(context.housing)), { mortgage: context.withMortgage })
			].join(context.separator),
			numbers: mapCopy.numbers.labels.map((label, i) => ({
				label,
				value: splitFigure([`restano ${eur}`, 'da +1.900 a −1.600 €', eur, eur][i])
			})),
			goals:
				`${w.list(names)}. ${fill(goals.saving.amount, { saving_eur: eur })}${fill(goals.saving.pac, { pac_eur: eur })}.`.replace(
					/^./,
					(x) => x.toUpperCase()
				),
			reader: {
				// One way of choosing: two or more take a second line, which on a page 1 this full
				// shortens the person's question there (it stays whole on page 4); see draw-map.spec.
				chosen: fill(mapCopy.snapshot.chosen.sentence, {
					how: longest(Object.values(mapCopy.snapshot.chosen.how))
				}),
				// Two 300-character answers would force a cut on page 1: the realistic maximum is a short
				// aspect to improve and a full-length question.
				improve: question.slice(0, 150).trim(),
				question
			}
		},
		areas: AREAS.map(area),
		highlights,
		nextSteps: {
			questions: [...highlights.flatMap((h) => h.question ?? []), question],
			gather: Object.values(mapCopy.gather)
		}
	};
}
