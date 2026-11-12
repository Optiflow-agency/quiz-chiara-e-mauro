import { describe, expect, it } from 'vitest';
import { mapCopy } from '../content/map.it.ts';
import { mapLayoutIt } from '../content/map-layout.it.ts';
import { fill } from './compose.ts';
import { RULES } from './rules.ts';
import { SAMPLE_SLOTS } from './sample-slots.ts';

const ADVICE = [
	/\bdevi\b/i,
	/\bdovresti\b/i,
	/\bdovreste\b/i,
	/ti conviene/i,
	/vi conviene/i,
	/consigli/i,
	/è meglio/i,
	/ti suggeri/i
];

/** The writing rule of spec section 6: a sentence never restates what the person answered. */
const RESTATEMENT = [/hai indicato/i, /hai detto/i, /hai risposto/i, /hai scelto/i];

/** Every string that can be printed: all of the copy except the reviewers' "never" notes. */
function printable(node: unknown, path = ''): [string, string][] {
	if (typeof node === 'string') return [[path, node]];
	if (typeof node !== 'object' || node === null) return [];
	return Object.entries(node).flatMap(([key, child]) =>
		key === 'never' ? [] : printable(child, `${path}.${key}`)
	);
}

const templates = (ruleId: string) => {
	const { text } = mapCopy.rules[ruleId];
	return Object.entries(typeof text === 'string' ? { text } : text);
};

const printed = printable(mapCopy);
/** The page chrome may name what the map is not ("non consiglia"): only the engine's copy is checked for advice. */
const chrome = printable(mapLayoutIt);

describe('copy', () => {
	it('has a text for each of the 50 rules and nothing else', () => {
		expect(RULES).toHaveLength(50);
		expect(Object.keys(mapCopy.rules).sort()).toEqual(RULES.map((r) => r.id).sort());
		expect(new Set(RULES.map((r) => r.id)).size).toBe(50);
	});

	it('gives a question to every rule that can be highlighted', () => {
		const missing = RULES.filter((r) => typeof r.tier === 'number' && r.tier <= 5)
			.filter((r) => !mapCopy.rules[r.id].question)
			.map((r) => r.id);
		expect(missing).toEqual([]);
	});

	it('ships every rule approved (rules 1.0.0)', () => {
		expect(RULES.filter((r) => !r.approved).map((r) => r.id)).toEqual([]);
	});

	it('fills every variant of every rule with persona-sized values, leaving no placeholder', () => {
		for (const rule of RULES) {
			for (const [variant, template] of templates(rule.id)) {
				const filled = fill(template, SAMPLE_SLOTS);
				expect(filled, `${rule.id} ${variant}`).not.toMatch(/[{}]/);
			}
		}
	});

	it('only uses slots the sample set can fill, so a missing one fails the test', () => {
		const used = RULES.flatMap((r) =>
			templates(r.id).flatMap(([, t]) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
		);
		expect(used.filter((name) => !(name in SAMPLE_SLOTS))).toEqual([]);
	});

	it('never says "hai indicato", "hai detto", "hai risposto" or "hai scelto"', () => {
		const hits = [...printed, ...chrome].flatMap(([path, text]) =>
			RESTATEMENT.filter((p) => p.test(text)).map((p) => `${path}: ${p}`)
		);
		expect(hits).toEqual([]);
	});

	it('contains no advice patterns in anything that can be printed', () => {
		const hits = printed.flatMap(([path, text]) =>
			ADVICE.filter((p) => p.test(text)).map((p) => `${path}: ${p}`)
		);
		expect(hits).toEqual([]);
	});

	it('catches advice and restatement wording', () => {
		expect(ADVICE.some((p) => p.test('Ti conviene spostare i soldi'))).toBe(true);
		expect(ADVICE.some((p) => p.test('Devi chiedere'))).toBe(true);
		expect(RESTATEMENT.some((p) => p.test('Hai indicato che non sai'))).toBe(true);
	});
});
