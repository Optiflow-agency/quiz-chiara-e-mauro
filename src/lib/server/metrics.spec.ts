import { describe, expect, it } from 'vitest';
import type { Catalogue } from '$lib/survey/catalogue';
import {
	devicesTable,
	formatDuration,
	funnelTable,
	median,
	parseFilters,
	pausesTable,
	questionsOf,
	responsesTable,
	summaryTable,
	timesTable,
	toCsv,
	type CounterRow,
	type EventRow,
	type JourneyRow
} from './metrics';

const now = new Date('2026-11-20T12:00:00Z');
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const counter = (screen_id: string, n: number, device: CounterRow['device'] = 'computer') =>
	({ day: '2026-11-19', catalogue_version: 'v', screen_id, device, n }) as CounterRow;
const journey = (id: string, o: Partial<JourneyRow> = {}): JourneyRow => ({
	id,
	catalogue_version: 'v',
	start_device: 'computer',
	started_at: iso(now.getTime() - 3 * DAY),
	last_event_at: iso(now.getTime() - 1 * DAY),
	completed_at: null,
	...o
});
const event = (journey_id: string, screen_id: string, o: Partial<EventRow> = {}): EventRow => ({
	journey_id,
	screen_id,
	outcome: null,
	duration_s: 10,
	device: 'computer',
	at: '2026-11-19T10:00:00Z',
	...o
});

const catalogue = {
	amountBandSets: {},
	sheets: [
		{
			id: 'S01',
			fields: [
				{ id: 'a', label: 'A', type: 'single', options: [], escapes: ['unknown'] },
				{ id: 'b', label: 'B', type: 'textarea', max_length: 10 }
			]
		},
		{ id: 'S03', fields: [{ id: 'c', label: 'C', type: 'band', band_set: 'x' }] },
		{ id: 'S05', fields: [{ id: 'd', label: 'D', type: 'single', options: [] }] }
	]
} as unknown as Catalogue;
const questions = questionsOf(catalogue);

describe('summary', () => {
	it('computes rates and splits in-progress from abandoned at 7 days', () => {
		const journeys = [
			...Array.from({ length: 5 }, (_, i) =>
				journey(`c${i}`, { completed_at: iso(now.getTime() - DAY) })
			),
			...Array.from({ length: 6 }, (_, i) =>
				journey(`p${i}`, { last_event_at: iso(now.getTime() - 7 * DAY + 60_000) })
			),
			...Array.from({ length: 7 }, (_, i) =>
				journey(`a${i}`, { last_event_at: iso(now.getTime() - 7 * DAY) })
			)
		];
		const t = summaryTable(
			[counter('visit', 100), counter('start', 40), counter('gate', 20)],
			journeys,
			now
		);
		const row = Object.fromEntries(t.rows.map(([k, val]) => [k, val]));
		expect(row['Completati']).toBe('5');
		expect(row['In corso (attivi negli ultimi 7 giorni)']).toBe('6');
		expect(row['Abbandonati (fermi da almeno 7 giorni)']).toBe('7');
		expect(row['Tasso di completamento (completati / iniziati)']).toBe('12,5 %');
		expect(row['Tasso di abbandono complessivo']).toBe('72,5 %');
	});

	it('hides counts of 1 to 4', () => {
		const t = summaryTable([counter('visit', 3)], [], now);
		expect(t.rows[0][1]).toBe('< 5');
	});
});

describe('funnel', () => {
	it('orders questions with the gate after S03 and computes drops', () => {
		expect(questions.map((q) => q.id)).toEqual(['S01.a', 'S01.b', 'S03.c', 'gate', 'S05.d']);
		const t = funnelTable(
			[counter('S01.a', 100), counter('S01.b', 80), counter('S03.c', 60), counter('gate', 60)],
			questions
		);
		expect(t.rows.map((r) => r[2])).toEqual(['—', '20,0 %', '25,0 %', '0,0 %', '100,0 %']);
		expect(t.bars?.[0]).toBe(1);
		expect(t.bars?.[2]).toBeCloseTo(0.6);
	});

	it('hides small counts and their drops', () => {
		const t = funnelTable([counter('S01.a', 100), counter('S01.b', 3)], questions);
		expect(t.rows[1].slice(1)).toEqual(['< 5', '< 5']);
		expect(t.bars?.[1]).toBe(0);
	});
});

describe('times', () => {
	it('computes mean and median, and total time on completed journeys', () => {
		const events = [
			...[10, 20, 30, 40, 50].map((d, i) => event(`j${i}`, 'S01.a', { duration_s: d })),
			event('j0', 'S01.b', { duration_s: 60 })
		];
		const journeys = [0, 1, 2, 3, 4].map((i) =>
			journey(`j${i}`, { completed_at: iso(now.getTime()) })
		);
		const t = timesTable(events, journeys, questions);
		expect(t.rows[0]).toEqual(['S01 · A', '5', '0:30', '0:30']);
		expect(t.rows[1][2]).toBe('< 5');
		// Journey totals: 70, 20, 30, 40, 50 seconds.
		expect(t.rows.at(-1)?.slice(1)).toEqual(['5', '0:42', '0:40']);
	});

	it('median of even and odd lists, and m:ss', () => {
		expect(median([3, 1, 2])).toBe(2);
		expect(median([4, 1, 2, 3])).toBe(2.5);
		expect(median([])).toBeNull();
		expect(formatDuration(65)).toBe('1:05');
	});
});

describe('responses', () => {
	const many = (n: number, f: (i: number) => EventRow[]) =>
		Array.from({ length: n }, (_, i) => f(i)).flat();

	it('takes the last outcome per journey, only on terminal journeys, with dashes for missing escapes', () => {
		const done = (id: string) => journey(id, { completed_at: iso(now.getTime()) });
		const stale = journey('stale', { last_event_at: iso(now.getTime() - 8 * DAY) });
		const live = journey('live');
		const journeys = [...Array.from({ length: 6 }, (_, i) => done(`d${i}`)), stale, live];
		const events = [
			// d0 first skips, then answers: the answer counts.
			event('d0', 'S01.a', { outcome: 'skipped', at: '2026-11-19T10:00:00Z' }),
			event('d0', 'S01.a', { outcome: 'answered', at: '2026-11-19T10:05:00Z' }),
			...many(5, (i) => [event(`d${i + 1}`, 'S01.a', { outcome: 'unknown' })]),
			event('stale', 'S01.a', { outcome: 'answered' }),
			event('live', 'S01.a', { outcome: 'answered' })
		];
		const t = responsesTable(events, journeys, questions, now);
		// 7 terminal journeys reached S01.a: 2 answered (d0, stale), 5 unknown.
		expect(t.rows[0]).toEqual(['S01 · A', '7', '< 5', '0 (0,0 %)', '5 (71,4 %)', '—']);
		// Textarea: no escapes offered.
		expect(t.rows[1].slice(4)).toEqual(['—', '—']);
		// Band: both escapes offered.
		expect(t.rows[2].slice(4)).toEqual(['0 (—)', '0 (—)'].map((x) => (x === '0 (—)' ? x : x)));
	});
});

describe('devices', () => {
	it('splits visits and journeys by device', () => {
		const t = devicesTable(
			[counter('visit', 30, 'smartphone'), counter('visit', 70, 'computer'), counter('gate', 9)],
			Array.from({ length: 5 }, (_, i) => journey(`j${i}`, { start_device: 'smartphone' }))
		);
		expect(t.rows[0]).toEqual(['Smartphone', '30', '30,0 %', '5', '100,0 %']);
		expect(t.rows[2].slice(1, 3)).toEqual(['70', '70,0 %']);
	});
});

describe('pauses', () => {
	it('detects pauses of at least 30 minutes and device changes on resume', () => {
		const at = (min: number) => iso(Date.parse('2026-11-19T10:00:00Z') + min * 60_000);
		const events: EventRow[] = [];
		const journeys: JourneyRow[] = [];
		for (let i = 0; i < 5; i++) {
			journeys.push(journey(`j${i}`));
			events.push(event(`j${i}`, 'S01.a', { at: at(0) }));
			// 29 minutes: not a pause. 30 minutes or more: a pause.
			events.push(event(`j${i}`, 'S01.b', { at: at(29) }));
			events.push(
				event(`j${i}`, 'S03.c', {
					at: at(29 + 30 + i * 60),
					device: i < 3 ? 'smartphone' : 'computer'
				})
			);
		}
		const t = pausesTable(events, journeys);
		expect(t.rows[0][1]).toBe('5');
		expect(t.rows[1][1]).toBe('100,0 %');
		expect(t.rows[4][1]).toBe('< 5');
		// Pauses last 0.5, 1.5, 2.5, 3.5, 4.5 hours.
		expect(t.rows[2][1]).toBe('2,5 h');
		expect(t.rows[3][1]).toBe('2,5 h');
	});

	it('shows a small sample as < 5', () => {
		const events = [
			event('j', 'S01.a', { at: '2026-11-19T10:00:00Z' }),
			event('j', 'S01.b', { at: '2026-11-19T12:00:00Z' })
		];
		expect(pausesTable(events, [journey('j')]).rows[2][1]).toBe('< 5');
	});
});

describe('filters', () => {
	it('defaults and bounds', () => {
		const f = parseFilters(new URLSearchParams(), now, 'v1');
		expect(f).toEqual({ from: '2026-10-22', to: '2026-11-20', device: 'all', version: 'v1' });
		const g = parseFilters(
			new URLSearchParams('dal=2020-01-01&al=2026-11-10&dispositivo=x&versione=all'),
			now,
			'v1'
		);
		expect(g.from).toBe('2025-11-10');
		expect(g.device).toBe('all');
		expect(g.version).toBe('all');
		expect(
			parseFilters(new URLSearchParams('dal=2026-02-31&versione=a b'), now, 'v1').version
		).toBe('v1');
	});
});

describe('csv', () => {
	it('adds a BOM, separates with semicolons and escapes', () => {
		const csv = toCsv({ columns: ['a', 'b;c'], rows: [['say "hi"', 'x\ny']] });
		expect(csv).toBe('﻿a;"b;c"\r\n"say ""hi""";"x\ny"\r\n');
	});
});
