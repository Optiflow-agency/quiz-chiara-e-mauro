<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		tone,
		labelledby = undefined,
		children
	}: {
		tone: 'dark' | 'light' | 'flat';
		labelledby?: string;
		children: Snippet;
	} = $props();
</script>

<section class="node node--{tone}" aria-labelledby={labelledby}>
	<div class="content">
		{@render children()}
	</div>
</section>

<style>
	/* One full-viewport screen; the stage in Survey stacks the outgoing and incoming ones. */
	.node {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-items: safe center;
		min-height: 100vh;
		min-height: 100svh;
		padding: 104px var(--gutter) 128px;
	}
	.node--dark {
		color: #fff;
		background:
			var(--grid) center / 96px 96px,
			radial-gradient(110% 90% at 80% 30%, #12386b 0%, var(--navy) 48%, var(--navy-deep) 100%);
	}
	/* Plain navy, as on the thank-you page: no grid or glow. */
	.node--flat {
		color: #fff;
		background: var(--navy-deep);
	}
	/* The white ground belongs to the slot around it, which the "grow" transition tints. */
	.node--light {
		color: var(--navy);
	}
	.content {
		width: min(720px, 100%);
		margin-inline: auto;
	}
	@media (max-width: 640px) {
		/* No dock to clear on phones: the sticky action row takes its place. */
		.node--light {
			padding-bottom: 24px;
		}
	}
</style>
