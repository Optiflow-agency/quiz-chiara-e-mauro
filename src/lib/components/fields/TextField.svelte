<script lang="ts">
	import { untrack } from 'svelte';
	import { messages as m } from '$lib/content/messages.it';
	import type { FieldValue } from '$lib/survey/answers';

	let {
		label,
		maxLength,
		value,
		onchange
	}: {
		label: string;
		maxLength: number;
		value: FieldValue | undefined;
		onchange: (value: FieldValue | undefined) => void;
	} = $props();

	let draft = $state(untrack(() => (typeof value === 'string' ? value : '')));
</script>

<textarea
	class="f-textarea"
	rows="4"
	maxlength={maxLength}
	aria-label={label}
	bind:value={draft}
	oninput={() => onchange(draft.trim() || undefined)}></textarea>
<p class="f-hint">{m.sheet.textHint}</p>
