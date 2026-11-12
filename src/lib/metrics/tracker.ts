import type { FieldValue } from '$lib/survey/answers';
import {
	MAX_BATCH_ITEMS,
	MAX_DURATION_S,
	type Device,
	type EventBatch,
	type Outcome,
	type ScreenEvent
} from './events';

export const FLUSH_INTERVAL_MS = 10_000;
export const EVENTS_URL = '/api/eventi';

/** `beacon` is for page hide, when a normal request may be cancelled. */
export type SendBatch = (batch: EventBatch, how: 'fetch' | 'beacon') => void;

export interface VisibilitySource {
	hidden(): boolean;
	/** Returns the unsubscribe function. */
	subscribe(onChange: () => void): () => void;
}

export interface TrackerDeps {
	send: SendBatch;
	now: () => number;
	visibility: VisibilitySource;
	device: Device;
	/** Whether consent is on record; leaves are only sent once it is. */
	consented: () => boolean;
	/** The session already held answers when the page loaded: its respondent started earlier. */
	hadAnswers: boolean;
}

/** Statistics are best-effort: failures are ignored and nothing is stored on the device. */
export function httpSend(fetchFn: typeof fetch, nav: Pick<Navigator, 'sendBeacon'>): SendBatch {
	return (batch, how) => {
		const body = JSON.stringify(batch);
		try {
			if (how === 'beacon') {
				nav.sendBeacon(EVENTS_URL, new Blob([body], { type: 'application/json' }));
			} else {
				fetchFn(EVENTS_URL, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body,
					keepalive: true
				}).catch(() => {});
			}
		} catch {
			// best effort
		}
	};
}

function outcomeOf(value: FieldValue | undefined): Outcome {
	if (value === undefined) return 'skipped';
	const first = typeof value === 'string' ? value : value.length === 1 ? value[0] : undefined;
	if (first === 'unknown' || first === 'withheld') return first;
	return 'answered';
}

export class Tracker {
	readonly #deps: TrackerDeps;
	readonly #reachedSeen = new Set<string>();
	#reached: string[] = [];
	#events: ScreenEvent[] = [];
	/** Leaves waiting for consent. */
	#held: ScreenEvent[] = [];
	#started: boolean;
	#current: { id: string; answer?: () => FieldValue | undefined } | null = null;
	#activeMs = 0;
	/** Start of the running visible stretch; null while hidden. */
	#since: number | null;
	readonly #timer: ReturnType<typeof setInterval>;
	readonly #unsubscribe: () => void;

	constructor(deps: TrackerDeps) {
		this.#deps = deps;
		this.#started = deps.hadAnswers;
		this.#since = deps.visibility.hidden() ? null : deps.now();
		this.#unsubscribe = deps.visibility.subscribe(() => this.#onVisibility());
		this.#timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
		this.#reach('visit');
	}

	/**
	 * A screen is now shown. Pass `answer` for question screens: it reads the current value, which
	 * decides the outcome when the screen is left.
	 */
	enter(screenId: string, answer?: () => FieldValue | undefined) {
		if (this.#current?.id === screenId) return;
		this.#leave();
		this.#current = { id: screenId, answer };
		this.#activeMs = 0;
		this.#since = this.#deps.visibility.hidden() ? null : this.#deps.now();
		this.#reach(screenId);
	}

	/** Consent may have just been recorded: send what was held. */
	release() {
		if (!this.#deps.consented()) return;
		this.#events.push(...this.#held);
		this.#held = [];
		this.#flushIfFull();
	}

	/** The respondent is done: close the current screen, mark the end, and send it all now. */
	complete() {
		this.#leave();
		this.#current = null;
		this.#reach('end');
		this.#record({ screen: 'end', duration: 0 });
		this.flush('beacon');
	}

	/** The page is going away. */
	pagehide() {
		this.#leave();
		this.#current = null;
		this.flush('beacon');
	}

	flush(how: 'fetch' | 'beacon' = 'fetch') {
		const { device } = this.#deps;
		this.#release();
		let reached = this.#reached;
		let events = this.#events;
		this.#reached = [];
		this.#events = [];
		while (reached.length + events.length > 0) {
			const r = reached.slice(0, MAX_BATCH_ITEMS);
			const e = events.slice(0, MAX_BATCH_ITEMS - r.length);
			reached = reached.slice(r.length);
			events = events.slice(e.length);
			this.#deps.send({ device, reached: r, events: e }, how);
		}
	}

	dispose() {
		clearInterval(this.#timer);
		this.#unsubscribe();
	}

	#release() {
		if (this.#held.length > 0 && this.#deps.consented()) {
			this.#events.push(...this.#held);
			this.#held = [];
		}
	}

	#reach(id: string) {
		if (this.#reachedSeen.has(id)) return;
		this.#reachedSeen.add(id);
		this.#reached.push(id);
		this.#flushIfFull();
	}

	#flushIfFull() {
		if (this.#reached.length + this.#events.length >= MAX_BATCH_ITEMS) this.flush();
	}

	#record(event: ScreenEvent) {
		if (this.#deps.consented()) {
			this.#release();
			this.#events.push(event);
			this.#flushIfFull();
		} else {
			this.#held.push(event);
		}
	}

	#onVisibility() {
		const now = this.#deps.now();
		if (this.#deps.visibility.hidden()) {
			if (this.#since !== null) this.#activeMs += now - this.#since;
			this.#since = null;
		} else if (this.#since === null) {
			this.#since = now;
		}
	}

	#leave() {
		const current = this.#current;
		if (!current) return;
		const now = this.#deps.now();
		const ms = this.#activeMs + (this.#since === null ? 0 : now - this.#since);
		const duration = Math.min(Math.max(Math.floor(ms / 1000), 0), MAX_DURATION_S);
		const event: ScreenEvent = { screen: current.id, duration };
		if (current.answer) {
			event.outcome = outcomeOf(current.answer());
			if (!this.#started && event.outcome !== 'skipped') {
				this.#started = true;
				this.#reach('start');
			}
		}
		this.#record(event);
	}
}
