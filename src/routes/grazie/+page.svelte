<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import Countdown from '$lib/components/Countdown.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { messages as m } from '$lib/content/messages.it';
</script>

<svelte:head>
	<title>{m.thanks.pageTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Picks up from the blue flood of the code check: the blue draws back, the page rises in. -->
<span class="cover" aria-hidden="true"></span>

<main>
	<div class="rise" style="--d: 0">
		<Heading id="thanks-title" before={m.thanks.title} accent={m.thanks.accent} />
	</div>
	<p class="rise" style="--d: 1">{m.thanks.body}</p>
	<p class="delivery rise" style="--d: 2">
		{m.thanks.delivery}<em>{m.thanks.deliveryAccent}</em>.
	</p>
	<div class="rise" style="--d: 3">
		<Countdown />
	</div>
	<p class="disclaimer rise" style="--d: 4">{m.thanks.notAdvice}</p>
	<div class="rise" style="--d: 5">
		<a href={resolve('/profilo')} class="btn">
			{m.thanks.profile}
			<Icon name="arrow" />
		</a>
	</div>
</main>

<style>
	main {
		max-width: 640px;
		min-height: 100dvh;
		margin: 0 auto;
		padding: 64px var(--gutter);
		color: var(--text-on-dark);
		font-size: clamp(17px, 2.4vw, 19px);
	}
	p {
		margin: 24px 0 0;
	}
	.btn {
		margin-top: 32px;
		text-decoration: none;
	}
	.delivery {
		margin-top: 28px;
		padding-left: 18px;
		border-left: 2px solid var(--accent-on-dark);
		font: 600 clamp(21px, 3.4vw, 26px) / 1.3 var(--font-display);
		letter-spacing: -0.015em;
		color: #fff;
	}
	.delivery em {
		font-style: italic;
		color: var(--accent-on-dark);
	}
	.disclaimer {
		font-size: 15px;
		line-height: 1.6;
		color: var(--muted-on-dark);
	}

	.cover {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--blue);
		clip-path: circle(0% at 50% 46%);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		.cover {
			animation: uncover 620ms var(--ease-out) both;
		}
		.rise {
			animation: rise 640ms var(--ease-out) both;
			animation-delay: calc(240ms + var(--d) * 90ms);
		}
	}

	@keyframes uncover {
		from {
			clip-path: circle(150% at 50% 46%);
		}
		to {
			clip-path: circle(0% at 50% 46%);
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
