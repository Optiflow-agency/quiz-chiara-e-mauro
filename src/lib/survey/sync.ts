import { applyPatch, diffAnswers, type AnswerPatch, type Answers } from './answers';

/** Why a save did not go through, in terms the respondent can act on. */
export type SyncProblem =
	'offline' | 'server' | 'rate_limited' | 'session' | 'consent' | 'rejected';

/** A failed send. Retryable ones (connection, server trouble) are queued again with backoff. */
export class SyncError extends Error {
	constructor(
		readonly problem: SyncProblem,
		readonly retryable: boolean
	) {
		super(problem);
	}
}

export interface SyncStatus {
	/** `saving`: changes waiting or being sent. `retrying`: last attempt failed, another is scheduled. `blocked`: needs the respondent (e.g. sign in again). */
	state: 'idle' | 'saving' | 'retrying' | 'blocked';
	/** Sheets the server has confirmed with their current value. */
	saved: number;
	problem?: SyncProblem;
}

export type SendPatch = (patch: AnswerPatch) => Promise<void>;

function problemFor(status: number): SyncError {
	if (status === 401) return new SyncError('session', false);
	if (status === 403) return new SyncError('consent', false);
	if (status === 429) return new SyncError('rate_limited', true);
	if (status >= 500 || status === 408) return new SyncError('server', true);
	return new SyncError('rejected', false);
}

/** Sends sheets to store or delete; resolves when applied, throws to be retried. */
export function httpSender(fetchFn: typeof fetch): SendPatch {
	return async (patch) => {
		let response: Response;
		try {
			response = await fetchFn('/api/answers', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(patch)
			});
		} catch {
			throw new SyncError('offline', true);
		}
		if (!response.ok) throw problemFor(response.status);
	};
}

/**
 * Keeps the server copy up to date, one sheet at a time. The sheets that differ from
 * what the server last confirmed are the queue: a burst of edits to a sheet becomes one entry
 * holding its latest value, a flush sends only those sheets, and a failed flush leaves them
 * queued to be retried with backoff. Sheets the browser has not touched are never sent, so
 * they are never overwritten. Sending a sheet is idempotent, so retries are harmless.
 */
export class AnswerSync {
	private latest: Answers = {};
	private confirmed: Answers = {};
	private running: Promise<void> | undefined;
	private failures = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private disposed = false;

	constructor(
		private readonly send: SendPatch,
		private readonly onStatus: (status: SyncStatus) => void = () => {},
		private readonly debounceMs = 5000
	) {}

	/** Marks these sheets as already stored on the server, so they are not sent again. */
	seed(stored: Answers): void {
		this.confirmed = applyPatch(this.confirmed, stored);
	}

	submit(snapshot: Answers): void {
		this.latest = snapshot;
		this.report(this.queued() ? 'saving' : 'idle');
		this.arm(this.debounceMs);
	}

	/** Try again now, e.g. when the connection comes back. */
	retry(): void {
		this.arm(0);
	}

	/** Sends everything queued right away; resolves true once the server has it all. */
	async flushNow(): Promise<boolean> {
		clearTimeout(this.timer);
		await this.run();
		return !this.queued();
	}

	dispose(): void {
		this.disposed = true;
		clearTimeout(this.timer);
	}

	private queued(): boolean {
		return Object.keys(diffAnswers(this.confirmed, this.latest)).length > 0;
	}

	private report(state: SyncStatus['state'], problem?: SyncProblem): void {
		if (this.disposed) return;
		const saved = Object.keys(this.latest).filter(
			(id) => JSON.stringify(this.confirmed[id]) === JSON.stringify(this.latest[id])
		).length;
		this.onStatus({ state, saved, problem });
	}

	private arm(delayMs: number): void {
		if (this.disposed) return;
		clearTimeout(this.timer);
		this.timer = setTimeout(() => void this.run(), delayMs);
	}

	private run(): Promise<void> {
		this.running ??= this.drain().finally(() => (this.running = undefined));
		return this.running;
	}

	/** Sends what is queued until nothing is left (edits made while sending are picked up) or a send fails. */
	private async drain(): Promise<void> {
		for (;;) {
			const patch = diffAnswers(this.confirmed, this.latest);
			if (Object.keys(patch).length === 0) {
				this.report('idle');
				return;
			}
			this.report('saving');
			try {
				await this.send(patch);
				this.confirmed = applyPatch(this.confirmed, patch);
				this.failures = 0;
			} catch (error) {
				const failure = error instanceof SyncError ? error : new SyncError('offline', true);
				if (!failure.retryable) {
					this.report('blocked', failure.problem);
					return;
				}
				this.failures += 1;
				this.report('retrying', failure.problem);
				this.arm(Math.min(1000 * 2 ** this.failures, 30_000));
				return;
			}
		}
	}
}
