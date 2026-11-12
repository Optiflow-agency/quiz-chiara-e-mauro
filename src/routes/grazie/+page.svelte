<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { resolve } from '$app/paths';
	import Heading from '$lib/components/Heading.svelte';
	import { messages as m } from '$lib/content/messages.it';
</script>

<svelte:head>
	<title>{m.thanks.pageTitle}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<Heading id="thanks-title" before={m.thanks.title} accent={m.thanks.accent} />
	<p>{m.thanks.body}</p>
	<a href={resolve('/profilo')} class="btn">
		{m.thanks.profile}
		<Icon name="arrow" />
	</a>
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
		margin: 24px 0;
	}
	p:last-of-type {
		margin-bottom: 32px;
	}
	.btn {
		text-decoration: none;
	}
</style>
