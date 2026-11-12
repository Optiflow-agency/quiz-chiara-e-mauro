import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnswerSync, SyncError, type SyncStatus } from './sync';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('AnswerSync', () => {
	it('sends a burst of edits as one patch holding each sheet’s latest value', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.submit({ S01: { scope: 'personal' } });
		sync.submit({ S01: { scope: 'family' }, S02: { a: 'x' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith({ S01: { scope: 'family' }, S02: { a: 'x' } });
	});

	it('waits 5s after the last edit before sending', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.submit({ S01: { a: 'x' } });
		await vi.advanceTimersByTimeAsync(4000);
		sync.submit({ S01: { a: 'y' } });
		await vi.advanceTimersByTimeAsync(4999);
		expect(send).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('then sends only the sheets that changed, and deletions as null', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.submit({ S01: { scope: 'personal' }, S02: { a: 'x' } });
		await vi.advanceTimersByTimeAsync(5000);
		sync.submit({ S01: { scope: 'personal' }, S03: { b: 'y' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenLastCalledWith({ S02: null, S03: { b: 'y' } });
		sync.submit({ S01: { scope: 'personal' }, S03: { b: 'y' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenCalledTimes(2);
	});

	it('sends nothing for an empty browser, so stored sheets are left alone', async () => {
		const send = vi.fn();
		new AnswerSync(send).submit({});
		await vi.advanceTimersByTimeAsync(60_000);
		expect(send).not.toHaveBeenCalled();
	});

	it('retries the queued sheets with backoff until the send succeeds', async () => {
		const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.submit({ S01: { scope: 'personal' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(2000);
		expect(send).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(send).toHaveBeenCalledTimes(2);
	});

	it('sends edits made during a send afterwards', async () => {
		let release!: () => void;
		const send = vi
			.fn()
			.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
			.mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.submit({ S01: { scope: 'personal' } });
		await vi.advanceTimersByTimeAsync(5000);
		sync.submit({ S01: { scope: 'family' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenCalledTimes(1);
		release();
		await vi.advanceTimersByTimeAsync(0);
		expect(send).toHaveBeenLastCalledWith({ S01: { scope: 'family' } });
	});

	it('stops retrying after a permanent failure and stops entirely once disposed', async () => {
		const send = vi.fn().mockRejectedValue(new SyncError('rejected', false));
		const sync = new AnswerSync(send);
		sync.submit({ S01: { scope: 'personal' } });
		await vi.advanceTimersByTimeAsync(60_000);
		expect(send).toHaveBeenCalledTimes(1);
		sync.dispose();
		sync.submit({ S01: { scope: 'family' } });
		await vi.advanceTimersByTimeAsync(60_000);
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('reports saving, then the saved count once the server has confirmed', async () => {
		const statuses: SyncStatus[] = [];
		const sync = new AnswerSync(vi.fn().mockResolvedValue(undefined), (s) => statuses.push(s));
		sync.submit({ S01: { a: 'x' }, S02: { a: 'y' } });
		expect(statuses.at(-1)).toEqual({ state: 'saving', saved: 0 });
		await vi.advanceTimersByTimeAsync(5000);
		expect(statuses.at(-1)).toEqual({ state: 'idle', saved: 2 });
	});

	it('names the problem: retryable ones keep retrying, others block', async () => {
		const statuses: SyncStatus[] = [];
		const send = vi
			.fn()
			.mockRejectedValueOnce(new SyncError('offline', true))
			.mockRejectedValue(new SyncError('session', false));
		const sync = new AnswerSync(send, (s) => statuses.push(s));
		sync.submit({ S01: { a: 'x' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(statuses.at(-1)).toMatchObject({ state: 'retrying', problem: 'offline', saved: 0 });
		await vi.advanceTimersByTimeAsync(2000);
		expect(statuses.at(-1)).toMatchObject({ state: 'blocked', problem: 'session' });
		expect(send).toHaveBeenCalledTimes(2);
	});

	it('flushNow sends immediately and says whether everything is stored', async () => {
		const send = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValue(new SyncError('server', true));
		const sync = new AnswerSync(send);
		sync.submit({ S01: { a: 'x' } });
		expect(await sync.flushNow()).toBe(true);
		sync.submit({ S01: { a: 'y' } });
		expect(await sync.flushNow()).toBe(false);
		expect(send).toHaveBeenCalledTimes(2);
	});
});

describe('AnswerSync.seed', () => {
	it('does not resend seeded sheets, but sends the others', async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const sync = new AnswerSync(send);
		sync.seed({ S01: { a: 'x' } });
		sync.submit({ S01: { a: 'x' }, S02: { b: 'y' } });
		await vi.advanceTimersByTimeAsync(5000);
		expect(send).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith({ S02: { b: 'y' } });
	});
});
