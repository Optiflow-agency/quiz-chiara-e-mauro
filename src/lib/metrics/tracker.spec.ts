import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FieldValue } from '$lib/survey/answers';
import { MAX_BATCH_ITEMS, MAX_DURATION_S, type EventBatch } from './events';
import { Tracker, type VisibilitySource } from './tracker';

function setup(opts: { consented?: boolean; hadAnswers?: boolean } = {}) {
	let time = 0;
	let hidden = false;
	const listeners = new Set<() => void>();
	const visibility: VisibilitySource = {
		hidden: () => hidden,
		subscribe: (cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		}
	};
	const sent: { batch: EventBatch; how: string }[] = [];
	const state = { consented: opts.consented ?? true };
	const tracker = new Tracker({
		send: (batch, how) => sent.push({ batch, how }),
		now: () => time,
		visibility,
		device: 'smartphone',
		consented: () => state.consented,
		hadAnswers: opts.hadAnswers ?? false
	});
	return {
		tracker,
		sent,
		state,
		advance: (s: number) => (time += s * 1000),
		setHidden(value: boolean) {
			hidden = value;
			listeners.forEach((cb) => cb());
		},
		listeners,
		reached: () => sent.flatMap((s) => s.batch.reached),
		events: () => sent.flatMap((s) => s.batch.events)
	};
}

const answered = (v: FieldValue | undefined) => () => v;

describe('Tracker', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('counts visit once and dedupes reached screens', () => {
		const t = setup();
		t.tracker.enter('welcome');
		t.tracker.enter('S01');
		t.tracker.enter('welcome');
		t.tracker.flush();
		expect(t.reached()).toEqual(['visit', 'welcome', 'S01']);
		t.tracker.flush();
		expect(t.sent).toHaveLength(1);
	});

	it('maps outcomes', () => {
		const t = setup({ hadAnswers: true });
		const cases: [FieldValue | undefined, string][] = [
			[undefined, 'skipped'],
			['unknown', 'unknown'],
			[['unknown'], 'unknown'],
			['withheld', 'withheld'],
			[['withheld'], 'withheld'],
			['a', 'answered'],
			[['a', 'unknown'], 'answered']
		];
		cases.forEach(([v], i) => t.tracker.enter(`q${i}`, answered(v)));
		t.tracker.enter('next');
		t.tracker.flush();
		expect(t.events().map((e) => e.outcome)).toEqual(cases.map(([, o]) => o));
	});

	it('leaves without answer reader carry no outcome', () => {
		const t = setup();
		t.tracker.enter('welcome');
		t.tracker.enter('S01');
		t.tracker.flush();
		expect(t.events()).toEqual([{ screen: 'welcome', duration: 0 }]);
	});

	it('counts start once, not for skipped, not when answers existed', () => {
		const t = setup();
		t.tracker.enter('a', answered(undefined));
		t.tracker.enter('b', answered('x'));
		t.tracker.enter('c', answered('x'));
		t.tracker.enter('d');
		t.tracker.flush();
		expect(t.reached().filter((r) => r === 'start')).toHaveLength(1);
		expect(t.reached().indexOf('start')).toBeGreaterThan(t.reached().indexOf('b'));

		const returning = setup({ hadAnswers: true });
		returning.tracker.enter('a', answered('x'));
		returning.tracker.enter('b');
		returning.tracker.flush();
		expect(returning.reached()).not.toContain('start');
	});

	it('measures whole visible seconds, excluding hidden time, capped', () => {
		const t = setup();
		t.tracker.enter('a');
		t.advance(4.9);
		t.setHidden(true);
		t.advance(100);
		t.setHidden(false);
		t.advance(2);
		t.tracker.enter('b');
		t.advance(10_000);
		t.tracker.enter('c');
		t.tracker.flush();
		expect(t.events().map((e) => e.duration)).toEqual([6, MAX_DURATION_S]);
	});

	it('holds leaves before consent and releases them on consent', () => {
		const t = setup({ consented: false });
		t.tracker.enter('a', answered('x'));
		t.tracker.enter('b');
		t.tracker.flush();
		expect(t.events()).toEqual([]);
		expect(t.reached()).toContain('a');
		t.state.consented = true;
		t.tracker.release();
		t.tracker.enter('c');
		t.tracker.flush();
		expect(t.events().map((e) => e.screen)).toEqual(['a', 'b']);
	});

	it('flushes on the interval and splits batches', () => {
		const t = setup();
		t.tracker.enter('a');
		vi.advanceTimersByTime(10_000);
		expect(t.sent).toHaveLength(1);
		for (let i = 0; i < 30; i++) t.tracker.enter(`s${i}`);
		t.tracker.flush();
		const sizes = t.sent.map((s) => s.batch.reached.length + s.batch.events.length);
		expect(sizes.every((n) => n <= MAX_BATCH_ITEMS)).toBe(true);
		expect(t.reached()).toHaveLength(32);
		expect(t.events()).toHaveLength(30);
	});

	it('completes with an end event sent by beacon', () => {
		const t = setup();
		t.tracker.enter('S10.x', answered('a'));
		t.advance(3);
		t.tracker.complete();
		const last = t.sent.at(-1)!;
		expect(last.how).toBe('beacon');
		expect(t.events()).toEqual([
			{ screen: 'S10.x', outcome: 'answered', duration: 3 },
			{ screen: 'end', duration: 0 }
		]);
		expect(t.reached()).toContain('end');
	});

	it('records the open screen and beacons on pagehide', () => {
		const t = setup();
		t.tracker.enter('a');
		t.advance(2);
		t.tracker.pagehide();
		expect(t.sent.at(-1)!.how).toBe('beacon');
		expect(t.events()).toEqual([{ screen: 'a', duration: 2 }]);
	});

	it('dispose clears the timer and listener', () => {
		const t = setup();
		t.tracker.dispose();
		expect(t.listeners.size).toBe(0);
		vi.advanceTimersByTime(60_000);
		expect(t.sent).toHaveLength(0);
	});
});
