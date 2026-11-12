<script lang="ts">
	let {
		id,
		before,
		accent = '',
		after = '',
		size = 'display'
	}: {
		id: string;
		before: string;
		accent?: string;
		after?: string;
		size?: 'display' | 'sheet';
	} = $props();
</script>

<h2 {id} class="heading heading--{size}" tabindex="-1" data-focus>
	{before}{#if accent}<em>{accent}</em>{/if}{after}
</h2>

<style>
	.heading {
		font-weight: 600;
	}
	.heading:focus {
		outline: none;
	}
	.heading--display {
		font-size: clamp(40px, 9.5vw, 84px);
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	.heading--sheet {
		font-size: clamp(26px, 5.2vw, 42px);
		line-height: 1.15;
	}
	em {
		font-style: italic;
		font-weight: 600;
		color: var(--accent-on-dark);
	}
	:global(.node--light) em {
		color: var(--blue-dark);
	}
</style>
