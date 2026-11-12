<script lang="ts">
	interface TurnstileApi {
		render(el: HTMLElement, options: Record<string, unknown>): string;
		reset(widgetId: string): void;
		remove(widgetId: string): void;
	}

	const API_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

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

	/** Loads Cloudflare's script once per page (later widgets reuse it). */
	function loadApi(): Promise<TurnstileApi> {
		const present = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;
		return new Promise((resolve, reject) => {
			const ready = present();
			if (ready) return resolve(ready);
			let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
			if (!script) {
				script = document.createElement('script');
				script.src = API_SRC;
				script.async = true;
				script.dataset.turnstile = '';
				document.head.append(script);
			}
			script.addEventListener('load', () => resolve(present()!), { once: true });
			script.addEventListener('error', () => reject(new Error('turnstile')), { once: true });
		});
	}

	$effect(() => {
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

		// Tokens are single-use: ask for a fresh one once the form has actually been submitted.
		const onSubmit = (event: SubmitEvent) =>
			setTimeout(() => {
				if (event.defaultPrevented || !api || widgetId === undefined) return;
				token = '';
				api.reset(widgetId);
			});
		form?.addEventListener('submit', onSubmit);

		loadApi()
			.then((loaded) => {
				if (cancelled) return;
				api = loaded;
				widgetId = loaded.render(target, {
					sitekey: siteKey,
					size: 'invisible',
					'response-field': false,
					callback: (value: string) => (token = value),
					'expired-callback': () => (token = ''),
					'error-callback': () => ((token = ''), (failed = true))
				});
			})
			.catch(() => (failed = true));

		return () => {
			cancelled = true;
			form?.removeEventListener('submit', onSubmit);
			if (api && widgetId !== undefined) api.remove(widgetId);
		};
	});
</script>

<div bind:this={host}></div>
<input type="hidden" name="captcha" value={token} />
{#if failed}
	<p class="error" role="alert">{unavailable}</p>
{/if}

<style>
	.error {
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
</style>
