<script lang="ts">
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';
	import Spinner from './Spinner.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import type { SurveySession } from '$lib/survey/session.svelte';
	import type { SyncStatus } from '$lib/survey/sync';

	let {
		session,
		syncStatus,
		onSubmit
	}: {
		session: SurveySession;
		syncStatus: SyncStatus;
		onSubmit: () => Promise<void>;
	} = $props();

	let submitting = $state(false);

	async function submit() {
		submitting = true;
		await onSubmit();
		submitting = false;
	}

	const problem = $derived(syncStatus.problem ? m.saveStatus.problem[syncStatus.problem] : null);
</script>

<Heading id="end-title" before={m.end.title} accent={m.end.accent} />
<p class="body">{m.end.answered(session.answeredCount, session.questionCount)}</p>
<p class="body note">{m.end.notAdvice}</p>
<button type="button" class="btn submit" disabled={submitting} onclick={submit}>
	{submitting ? m.end.submitting : m.end.submit}
	{#if submitting}<Spinner />{:else}<Icon name="arrow" />{/if}
</button>
<p class="body note" role="status" aria-live="polite">
	{#if !submitting && problem}{problem}{/if}
</p>

<style>
	.body {
		max-width: 52ch;
		margin-top: 24px;
		font-size: clamp(17px, 2.4vw, 20px);
		color: var(--text-on-dark);
	}
	.note {
		font-size: 16px;
		color: var(--muted-on-dark);
	}
	.submit {
		margin-top: 36px;
	}
</style>
