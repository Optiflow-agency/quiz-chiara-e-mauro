<script lang="ts">
	import Field from './fields/Field.svelte';
	import Icon from './Icon.svelte';
	import type { Morph } from './motion';
	import { messages as m } from '$lib/content/messages.it';
	import type { Answers, FieldValue } from '$lib/survey/answers';
	import type { Catalogue, CatalogueField, CatalogueSheet } from '$lib/survey/catalogue';
	import { mustAnswer } from '$lib/survey/screens';

	let {
		sheet,
		field,
		catalogue,
		answers,
		morph,
		canBack,
		canNext,
		onchange,
		onback,
		onnext
	}: {
		sheet: CatalogueSheet;
		field: CatalogueField;
		catalogue: Catalogue;
		answers: Answers;
		morph: Morph;
		canBack: boolean;
		/** False while the question still needs an answer. */
		canNext: boolean;
		onchange: (value: FieldValue | undefined) => void;
		onback: () => void;
		onnext: () => void;
	} = $props();

	// Bumped on clear so the field drops the text the respondent had typed.
	let cleared = $state(0);

	const [send, receive] = $derived(morph);
	const value = $derived(answers[sheet.id]?.[field.id]);
	const answered = $derived(value !== undefined);
</script>

<article class="q" aria-label={sheet.prompt}>
	<div class="head" in:receive|global={{ key: sheet.id }} out:send|global={{ key: sheet.id }}>
		<p class="prompt">{sheet.prompt}</p>
	</div>
	<details class="why">
		<summary>
			{m.sheet.why}
			<Icon name="down" size={16} />
		</summary>
		<p>{sheet.help}</p>
	</details>

	{#key cleared}
		<div class="field">
			<Field {field} {catalogue} {answers} {value} {onchange} />
		</div>
	{/key}

	{#if answered}
		<p class="clear">
			<button
				type="button"
				class="f-link"
				onclick={() => {
					onchange(undefined);
					cleared++;
				}}>{m.sheet.clear}</button
			>
		</p>
	{/if}

	<div class="actions">
		<button type="button" class="back" disabled={!canBack} onclick={onback}>
			<Icon name="arrow" size={18} />
			{m.nav.back}
		</button>
		<button type="button" class="btn" disabled={!canNext} onclick={onnext}>
			{answered || mustAnswer(field) ? m.nav.next : m.nav.skip}
			<Icon name="arrow" />
		</button>
	</div>
</article>

<style>
	.q {
		display: grid;
		gap: 14px;
	}
	/* Compact sheet header: small, muted, in the display face. */
	.prompt {
		font: 600 14px/1.4 var(--font-display);
		letter-spacing: -0.01em;
		color: var(--muted);
	}
	.why {
		font-size: 15px;
		color: var(--muted);
	}
	.why summary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
		margin-block: -10px;
		font-weight: 700;
		color: var(--blue-dark);
		cursor: pointer;
		list-style: none;
	}
	.why summary::-webkit-details-marker {
		display: none;
	}
	.why summary :global(svg) {
		transition: transform 0.2s var(--ease-out);
	}
	.why[open] summary :global(svg) {
		transform: rotate(180deg);
	}
	.why p {
		max-width: 52ch;
		margin-top: 14px;
	}
	.field {
		margin-top: 10px;
	}
	/* One question per screen: the question itself is the headline. */
	.field :global(.f-label) {
		margin-bottom: 14px;
		font: 600 clamp(24px, 4.6vw, 36px) / 1.2 var(--font-display);
		letter-spacing: -0.02em;
		text-wrap: balance;
	}
	/* The label is unmasked from below; the options follow in a short stagger (at most 120ms). */
	.field :global(.f-label) {
		animation: label-in 420ms var(--ease-out) 60ms backwards;
	}
	.field :global(.f-option),
	.field :global(.f-textarea) {
		animation: option-in 360ms var(--ease-out) calc(90ms + min(var(--i, 0) * 20ms, 120ms)) backwards;
	}
	@keyframes label-in {
		from {
			clip-path: inset(0 0 100% 0);
			transform: translateY(10px);
		}
		to {
			clip-path: inset(-0.3em -0.2em -0.3em -0.2em);
			transform: none;
		}
	}
	@keyframes option-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
	.clear {
		font-size: 14px;
	}
	.actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 14px;
	}
	.back {
		display: none;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 12px;
		border: 0;
		background: none;
		font: 700 15px var(--font-body);
		color: var(--blue-dark);
		cursor: pointer;
	}
	.back :global(svg) {
		transform: scaleX(-1);
	}
	.back:disabled {
		visibility: hidden;
	}
	@media (max-width: 640px) {
		/* Always reachable on long lists (S10 has 14 options); the dock is hidden here. */
		.actions {
			position: sticky;
			bottom: 0;
			justify-content: space-between;
			margin-inline: calc(var(--gutter) * -1);
			padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
			background: #fff;
			box-shadow: 0 -10px 16px -8px #fff;
		}
		.back {
			display: inline-flex;
		}
	}
</style>
