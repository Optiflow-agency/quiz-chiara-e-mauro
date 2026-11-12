<script lang="ts">
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';
	import type { Morph } from './motion';
	import { messages as m } from '$lib/content/messages.it';
	import type { CatalogueSheet } from '$lib/survey/catalogue';

	let {
		sheet,
		morph,
		onnext
	}: {
		sheet: CatalogueSheet;
		morph: Morph;
		onnext: () => void;
	} = $props();

	const [send, receive] = $derived(morph);
	// "S05" -> "05"
	const ordinal = $derived(sheet.id.replace(/\D/g, '').padStart(2, '0'));
</script>

<article class="intro" aria-labelledby="{sheet.id}-title">
	<span class="ordinal" aria-hidden="true">{ordinal}</span>
	<!-- The outer box flies into the question header; the inner one carries the rising mask. -->
	<div class="prompt" in:receive|global={{ key: sheet.id }} out:send|global={{ key: sheet.id }}>
		<div class="prompt__rise">
			<Heading id="{sheet.id}-title" before={sheet.prompt} size="sheet" />
		</div>
	</div>
	<p class="help">{sheet.help}</p>
	<div class="go">
		<button type="button" class="btn" onclick={onnext}>
			{m.nav.start}
			<Icon name="arrow" />
		</button>
	</div>
</article>

<style>
	.intro {
		display: grid;
		gap: 14px;
	}
	/* Outline numeral, decorative: it slides in from the right while the screen is wiped in. */
	.ordinal {
		justify-self: start;
		margin-bottom: 4px;
		font: 600 clamp(96px, 22vw, 200px) / 0.85 var(--font-display);
		letter-spacing: -0.04em;
		color: transparent;
		-webkit-text-stroke: 1.5px #b9c6d8;
		font-variant-numeric: lining-nums;
		animation: ordinal-in 640ms var(--ease-out) 80ms backwards;
	}
	.prompt__rise {
		animation: prompt-in 520ms var(--ease-out) 220ms backwards;
	}
	.help {
		max-width: 52ch;
		color: var(--muted);
		animation: fade-up 400ms var(--ease-out) 340ms backwards;
	}
	.go {
		margin-top: 18px;
		animation: fade-up 360ms var(--ease-out) 440ms backwards;
	}
	@keyframes ordinal-in {
		from {
			opacity: 0;
			transform: translateX(24%) scale(1.08);
		}
	}
	/* A mask rising over the prompt; its bounds leave room for italic overhang and descenders. */
	@keyframes prompt-in {
		from {
			clip-path: inset(100% -0.2em -0.3em -0.2em);
			transform: translateY(0.45em);
		}
		to {
			clip-path: inset(-0.3em -0.2em -0.3em -0.2em);
			transform: none;
		}
	}
	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
</style>
