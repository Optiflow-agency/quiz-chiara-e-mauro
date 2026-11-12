<script lang="ts">
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';
	import type { SectionContent } from '$lib/survey/types';

	let {
		id,
		content,
		cue = false,
		onNext
	}: {
		id: string;
		content: SectionContent;
		/** Invite to start, after a pause; quieter than the dock's cue. */
		cue?: boolean;
		onNext: () => void;
	} = $props();

	const parts = $derived.by(() => {
		const at = content.accent ? content.title.indexOf(content.accent) : -1;
		if (!content.accent || at === -1) return { before: content.title, accent: '', after: '' };
		return {
			before: content.title.slice(0, at),
			accent: content.accent,
			after: content.title.slice(at + content.accent.length)
		};
	});
</script>

<Heading id="{id}-title" {...parts} />
{#if content.intro || content.note}
	<!-- One column: the lead and the note share a measure and end on the same edge. -->
	<div class="lede">
		{#if content.intro}<p class="intro">{content.intro}</p>{/if}
		{#if content.note}<p class="note">{content.note}</p>{/if}
	</div>
{/if}
{#if content.cta}
	<div class="start">
		<button type="button" class="btn" class:cue onclick={onNext}>
			{content.cta}
			<Icon name="arrow" />
		</button>
		{#if content.duration}
			<span class="duration"><Icon name="clock" size={16} />{content.duration}</span>
		{/if}
	</div>
{/if}

<style>
	.lede {
		max-width: 34rem;
		margin-top: 28px;
	}
	.intro {
		font-size: clamp(17px, 2.4vw, 20px);
		color: var(--text-on-dark);
		text-wrap: pretty;
	}
	.note {
		margin-top: 16px;
		font-size: 16px;
		color: var(--muted-on-dark);
		text-wrap: pretty;
	}
	/* The action and what it costs, on one line; the time wraps under the button when narrow. */
	.start {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px 24px;
		margin-top: 40px;
	}
	/* The dock's cue, subdued for the first screen: one faint ring, a slower beat, a slight lift. */
	.cue {
		animation: cta-cue 2.4s var(--ease-out) infinite;
	}
	@keyframes cta-cue {
		0% {
			transform: translateY(0);
			box-shadow: 0 0 0 0 rgba(30, 111, 232, 0.45);
		}
		18% {
			transform: translateY(-2px);
		}
		36% {
			transform: translateY(0);
		}
		70%,
		100% {
			box-shadow: 0 0 0 14px rgba(30, 111, 232, 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cue {
			animation: none;
			box-shadow: 0 0 0 3px rgba(30, 111, 232, 0.35);
		}
	}
	.duration {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 15px;
		color: var(--muted-on-dark);
		font-variant-numeric: tabular-nums;
	}
</style>
