<script lang="ts">
	let {
		id,
		value = $bindable(''),
		label,
		error = null
	}: {
		id: string;
		value?: string;
		label: string;
		/** Message shown under the field; marks it invalid. */
		error?: string | null;
	} = $props();
</script>

<label class="field">
	<span class="field__label">{label}</span>
	<input
		type="email"
		name="email"
		autocomplete="email"
		inputmode="email"
		maxlength="254"
		required
		bind:value
		aria-invalid={error !== null}
		aria-describedby={error ? `${id}-error` : undefined}
	/>
	{#if error}
		<span class="error" id="{id}-error">{error}</span>
	{/if}
</label>

<style>
	.field {
		display: grid;
		gap: 8px;
	}
	.field__label {
		font-size: 14px;
		font-weight: 700;
	}
	input {
		width: 100%;
		padding: 15px 16px;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-field);
		background: #fff;
		color: var(--navy);
		font: inherit;
		font-size: 16px;
	}
	input:focus {
		border-color: var(--blue);
		box-shadow: 0 0 0 3px rgba(111, 163, 255, 0.35);
		outline: none;
	}
	input[aria-invalid='true'] {
		border-color: var(--error-on-dark);
	}
	.error {
		font-size: 14px;
		font-weight: 700;
		color: var(--error-on-dark);
	}
</style>
