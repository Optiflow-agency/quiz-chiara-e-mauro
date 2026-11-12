<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Survey from '$lib/components/Survey.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import { browserDeviceEnv, deviceClass } from '$lib/metrics/device';
	import { httpSend, Tracker } from '$lib/metrics/tracker';
	import { SurveySession } from '$lib/survey/session.svelte';
	import { AnswerSync, httpSender, type SyncStatus } from '$lib/survey/sync';

	let { data } = $props();

	// Answers live in device storage until consent is on record; from then on they are also saved on the server.
	const session = new SurveySession(
		untrack(() => data.catalogue),
		browser ? localStorage : null,
		() => data.consented,
		untrack(() => data.answers)
	);

	// Once consent is on record, changed sheets are queued and sent (retried on failure).
	let syncStatus = $state<SyncStatus>({ state: 'idle', saved: 0 });
	const sync = new AnswerSync(httpSender(fetch), (status) => (syncStatus = status));
	sync.seed(untrack(() => data.answers));
	$effect(() => {
		if (data.consented) sync.submit($state.snapshot(session.answers));
	});
	$effect(() => {
		const retry = () => sync.retry();
		window.addEventListener('online', retry);
		return () => {
			window.removeEventListener('online', retry);
			sync.dispose();
		};
	});

	// Anonymous screen statistics (nothing stored on the device); leaves are sent only once consent is on record.
	const tracker = browser
		? new Tracker({
				send: httpSend(fetch, navigator),
				now: Date.now,
				visibility: {
					hidden: () => document.hidden,
					subscribe: (onChange) => {
						document.addEventListener('visibilitychange', onChange);
						return () => document.removeEventListener('visibilitychange', onChange);
					}
				},
				device: deviceClass(browserDeviceEnv(window)),
				consented: () => data.consented,
				hadAnswers: Object.keys(session.answers).length > 0
			})
		: null;
	$effect(() => {
		if (data.consented) tracker?.release();
	});
	$effect(() => {
		const hide = () => tracker?.pagehide();
		window.addEventListener('pagehide', hide);
		return () => {
			window.removeEventListener('pagehide', hide);
			tracker?.dispose();
		};
	});

	/** Leaves for the thank-you page once the server holds every answer; tries once more if the first send fails. */
	async function submit() {
		const stored =
			(await sync.flushNow()) || (syncStatus.state !== 'blocked' && (await sync.flushNow()));
		if (stored) {
			tracker?.complete();
			await goto(resolve('/grazie'));
		}
	}
</script>

<svelte:head>
	<title>{m.survey.pageTitle}</title>
	<meta name="description" content={m.survey.description} />
</svelte:head>

<Survey {session} hasSession={data.hasSession} {syncStatus} {tracker} onSubmit={submit} />
