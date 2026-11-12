<script lang="ts">
	import Icon from '../Icon.svelte';
	import { messages as m } from '$lib/content/messages.it';
	import type { CatalogueOption, Escape } from '$lib/survey/catalogue';
	import type { FieldValue } from '$lib/survey/answers';

	let {
		name,
		multiple,
		options,
		escapes = [],
		maxChoices,
		value,
		onchange
	}: {
		name: string;
		multiple: boolean;
		options: CatalogueOption[];
		escapes?: readonly Escape[];
		maxChoices?: number;
		value: FieldValue | undefined;
		onchange: (value: FieldValue | undefined) => void;
	} = $props();

	const selected = $derived(
		Array.isArray(value) ? (value as string[]) : value ? [String(value)] : []
	);
	// Escapes are listed after the options; they and the exclusive options stand alone.
	const choices = $derived<CatalogueOption[]>([
		...options,
		...escapes.map((escape) => ({ value: escape, label: m.field[escape], exclusive: true }))
	]);
	const full = $derived(maxChoices !== undefined && selected.length >= maxChoices);

	function choose(option: CatalogueOption) {
		if (!multiple) return onchange(option.value);
		const held = selected.includes(option.value);
		const next =
			option.exclusive && !held
				? [option.value]
				: held
					? selected.filter((v) => v !== option.value)
					: [
							...selected.filter((v) => !choices.find((c) => c.value === v)?.exclusive),
							option.value
						];
		onchange(next.length ? next : undefined);
	}
</script>

{#each choices as option, index (option.value)}
	{@const isSelected = selected.includes(option.value)}
	<label class="f-option" class:is-selected={isSelected} style="--i: {index}">
		<input
			type={multiple ? 'checkbox' : 'radio'}
			{name}
			checked={isSelected}
			disabled={multiple && full && !isSelected && !option.exclusive}
			onchange={() => choose(option)}
		/>
		<span class="f-mark" class:is-round={!multiple} aria-hidden="true">
			{#if isSelected}<Icon name="check" size={14} />{/if}
		</span>
		<span>{option.label}</span>
	</label>
{/each}
{#if multiple && maxChoices}<p class="f-hint">{m.field.maxChoices(maxChoices)}</p>{/if}
