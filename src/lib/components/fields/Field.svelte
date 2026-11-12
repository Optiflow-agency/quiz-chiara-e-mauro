<script lang="ts">
	import './fields.css';
	import ChoiceField from './ChoiceField.svelte';
	import TextField from './TextField.svelte';
	import type { Answers, FieldValue } from '$lib/survey/answers';
	import { visibleOptions } from '$lib/survey/conditions';
	import { ESCAPES, type Catalogue, type CatalogueField } from '$lib/survey/catalogue';

	let {
		field,
		catalogue,
		answers,
		value,
		onchange
	}: {
		field: CatalogueField;
		catalogue: Catalogue;
		answers: Answers;
		value: FieldValue | undefined;
		onchange: (value: FieldValue | undefined) => void;
	} = $props();
</script>

<fieldset class="f-field" data-focus tabindex="-1">
	<legend class="f-label">{field.label}</legend>
	{#if field.note}<p class="f-hint">{field.note}</p>{/if}

	{#if field.type === 'single' || field.type === 'multi'}
		<ChoiceField
			name={field.id}
			multiple={field.type === 'multi'}
			options={visibleOptions(field.options, answers)}
			escapes={field.escapes}
			maxChoices={field.max_choices}
			{value}
			{onchange}
		/>
	{:else if field.type === 'band'}
		<ChoiceField
			name={field.id}
			multiple={false}
			options={catalogue.amountBandSets[field.band_set]}
			escapes={ESCAPES}
			{value}
			{onchange}
		/>
	{:else if field.type === 'textarea'}
		<TextField label={field.label} maxLength={field.max_length} {value} {onchange} />
	{/if}
</fieldset>
