import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { MAX_BATCH_ITEMS } from '$lib/metrics/events';
import { allowedScreens, parseBatch } from './metrics-ingest';

const q = `${catalogue.sheets[0].id}.${catalogue.sheets[0].fields[0].id}`;
const ok = {
	device: 'tablet',
	reached: ['welcome'],
	events: [{ screen: q, outcome: 'answered', duration: 5 }]
};

describe('allowedScreens', () => {
	it('covers every kind of screen id', () => {
		const ids = allowedScreens(catalogue);
		const sheet = catalogue.sheets[0];
		for (const id of [
			'welcome',
			`section-${sheet.id}`,
			sheet.id,
			q,
			'gate',
			'end',
			'visit',
			'start'
		])
			expect(ids.has(id)).toBe(true);
		expect(ids.has('S99')).toBe(false);
	});
});

describe('parseBatch', () => {
	it('accepts a valid batch', () => {
		expect(parseBatch(catalogue, ok)).toEqual(ok);
	});

	it('accepts reached only and events without outcome on intros', () => {
		expect(
			parseBatch(catalogue, { device: 'computer', reached: ['visit'], events: [] })
		).not.toBeNull();
		const s = catalogue.sheets[0].id;
		expect(
			parseBatch(catalogue, {
				device: 'computer',
				reached: [],
				events: [{ screen: s, duration: 0 }]
			})
		).not.toBeNull();
	});

	it.each([
		['non-object', 'x'],
		['array', []],
		['bad device', { ...ok, device: 'tv' }],
		['unknown reached screen', { ...ok, reached: ['nope'] }],
		['unknown event screen', { ...ok, events: [{ screen: 'S99.x', duration: 1 }] }],
		[
			'outcome on non-question',
			{ ...ok, events: [{ screen: 'end', outcome: 'answered', duration: 1 }] }
		],
		['bad outcome', { ...ok, events: [{ screen: q, outcome: 'maybe', duration: 1 }] }],
		['negative duration', { ...ok, events: [{ screen: q, duration: -1 }] }],
		['fractional duration', { ...ok, events: [{ screen: q, duration: 1.5 }] }],
		['huge duration', { ...ok, events: [{ screen: q, duration: 301 }] }],
		['empty batch', { ...ok, reached: [], events: [] }],
		['too many items', { ...ok, reached: Array(MAX_BATCH_ITEMS + 1).fill('visit'), events: [] }],
		['extra key', { ...ok, user: 'x' }],
		['extra event key', { ...ok, events: [{ screen: q, duration: 1, id: 1 }] }]
	])('rejects %s', (_, input) => {
		expect(parseBatch(catalogue, input)).toBeNull();
	});
});
