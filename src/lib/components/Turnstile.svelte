<script lang="ts">
	import { messages as m } from '$lib/content/messages.it';

	interface TurnstileApi {
		render(el: HTMLElement, options: Record<string, unknown>): string;
		reset(widgetId: string): void;
		remove(widgetId: string): void;
	}

	const API_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
	/** Automatic attempts after the first one, for the script download and for the check itself. */
	const RETRIES = 3;
	/** Base pause before a retry; doubles each time (1.5 s, 3 s, 6 s). */
	const RETRY_MS = 1500;
	/** How long without a token before telling the person the check is still running. */
	const WAIT_HINT_MS = 1200;

	let {
		siteKey,
		token = $bindable(''),
		unavailable
	}: {
		/** Public site key; when missing the widget fails closed with the `unavailable` message. */
		siteKey: string | undefined;
		/** Current single-use token, mirrored into the hidden `captcha` field. Empty until solved. */
		token?: string;
		/** Message shown when the check cannot run. */
		unavailable: string;
	} = $props();

	let host = $state<HTMLElement>();
	let failed = $state(false);
	/** The check has been running for a while: say so, since the submit button waits for it. */
	let waiting = $state(false);
	/** Bumped by "Riprova" to rebuild the widget from scratch. */
	let run = $state(0);

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

	/** Loads Cloudflare's script once per page (later widgets reuse it); a failed tag is replaced. */
	function loadApi(): Promise<TurnstileApi> {
		const present = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;
		return new Promise((resolve, reject) => {
			const ready = present();
			if (ready) return resolve(ready);
			let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
			if (script?.dataset.turnstile === 'failed') {
				script.remove();
				script = null;
			}
			if (!script) {
				script = document.createElement('script');
				script.src = API_SRC;
				script.async = true;
				script.dataset.turnstile = '';
				document.head.append(script);
			}
			const tag = script;
			tag.addEventListener(
				'load',
				() => {
					const api = present();
					if (api) resolve(api);
					else reject(new Error('turnstile'));
				},
				{ once: true }
			);
			tag.addEventListener(
				'error',
				() => {
					tag.dataset.turnstile = 'failed';
					reject(new Error('turnstile'));
				},
				{ once: true }
			);
		});
	}

	/** A flaky network gets a few more chances before the person sees an error. */
	async function loadWithRetries(): Promise<TurnstileApi> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await loadApi();
			} catch (error) {
				if (attempt >= RETRIES) throw error;
				await sleep(RETRY_MS * 2 ** attempt);
			}
		}
	}

	$effect(() => {
		void run;
		if (!host) return;
		if (!siteKey) {
			failed = true;
			return;
		}
		const target = host;
		const form = target.closest('form');
		let api: TurnstileApi | undefined;
		let widgetId: string | undefined;
		let cancelled = false;
		let errors = 0;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;
		let waitTimer: ReturnType<typeof setTimeout> | undefined;

		failed = false;
		waiting = false;

		const expectWait = () => {
			clearTimeout(waitTimer);
			waitTimer = setTimeout(() => {
				if (!cancelled && !token) waiting = true;
			}, WAIT_HINT_MS);
		};
		const giveUp = () => {
			token = '';
			waiting = false;
			failed = true;
		};
		expectWait();

		// Tokens are single-use: ask for a fresh one once the form has actually been submitted.
		const onSubmit = (event: SubmitEvent) =>
			setTimeout(() => {
				if (event.defaultPrevented || !api || widgetId === undefined) return;
				token = '';
				expectWait();
				api.reset(widgetId);
			});
		form?.addEventListener('submit', onSubmit);

		loadWithRetries()
			.then((loaded) => {
				if (cancelled) return;
				api = loaded;
				widgetId = loaded.render(target, {
					sitekey: siteKey,
					size: 'invisible',
					'response-field': false,
					// Retries are ours (below), so the person only sees an error after all of them.
					retry: 'never',
					'refresh-expired': 'auto',
					callback: (value: string) => {
						errors = 0;
						failed = false;
						waiting = false;
						token = value;
					},
					'expired-callback': () => {
						token = '';
						expectWait();
					},
					'error-callback': () => {
						token = '';
						if (errors >= RETRIES) {
							giveUp();
							return true;
						}
						clearTimeout(retryTimer);
						retryTimer = setTimeout(
							() => {
								if (!cancelled && api && widgetId !== undefined) api.reset(widgetId);
							},
							RETRY_MS * 2 ** errors
						);
						errors += 1;
						return true;
					}
				});
			})
			.catch(() => {
				if (!cancelled) giveUp();
			});

		return () => {
			cancelled = true;
			clearTimeout(retryTimer);
			clearTimeout(waitTimer);
			form?.removeEventListener('submit', onSubmit);
			if (api && widgetId !== undefined) api.remove(widgetId);
		};
	});
</script>

<div bind:this={host}></div>
<input type="hidden" name="captcha" value={token} />
{#if failed}
	<div class="failed" role="alert">
		<p class="error">{unavailable}</p>
		{#if siteKey}
			<button type="button" class="retry" onclick={() => (run += 1)}>
				{m.securityCheck.retry}
			</button>
		{/if}
	</div>
{:else if waiting && !token}
	<p class="waiting" role="status">
		<span class="dot" aria-hidden="true"></span>
		{m.securityCheck.checking}
	</p>
{/if}

<style>
	p {
		margin: 0;
	}
	.failed {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
	}
	.error {
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
	.retry {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		color: var(--accent-on-dark);
		text-decoration: underline;
		text-underline-offset: 3px;
		cursor: pointer;
	}
	.waiting {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--muted-on-dark);
	}
	.dot {
		width: 8px;
		height: 8px;
		flex: none;
		border-radius: 50%;
		background: var(--accent-on-dark);
	}
	@media (prefers-reduced-motion: no-preference) {
		.dot {
			animation: pulse 1s ease-in-out infinite alternate;
		}
	}
	@keyframes pulse {
		from {
			opacity: 0.25;
		}
		to {
			opacity: 1;
		}
	}
</style>
