<script lang="ts">
	import { onMount } from 'svelte';
	import { EVENT_START } from '$lib/content/event';
	import { messages as m } from '$lib/content/messages.it';

	/** Quiet countdown to the event: the date, then days, hours, minutes and seconds in a row. */
	const c = m.thanks.countdown;
	let now = $state(Date.now());

	onMount(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	const left = $derived(Math.max(0, Math.floor((EVENT_START.getTime() - now) / 1000)));
	const units = $derived([
		{ key: 'days', label: c.units.days, value: Math.floor(left / 86400) },
		{ key: 'hours', label: c.units.hours, value: Math.floor(left / 3600) % 24 },
		{ key: 'minutes', label: c.units.minutes, value: Math.floor(left / 60) % 60 },
		{ key: 'seconds', label: c.units.seconds, value: left % 60 }
	]);
	const pad = (n: number) => String(n).padStart(2, '0');
</script>

<section class="countdown" aria-labelledby="countdown-kicker">
	<p class="kicker" id="countdown-kicker">{c.kicker}</p>
	<p class="when">{c.when}</p>

	{#if left > 0}
		<dl class="units" role="timer" aria-live="off">
			{#each units as u (u.key)}
				<div class="unit">
					<dt class="label">{u.label}</dt>
					<dd class="value">{pad(u.value)}</dd>
				</div>
			{/each}
		</dl>
	{:else}
		<p class="live">{c.live}</p>
	{/if}
</section>

<style>
	.countdown {
		margin-top: 40px;
		padding: 24px 0;
		border-top: 1px solid rgba(167, 187, 214, 0.22);
		border-bottom: 1px solid rgba(167, 187, 214, 0.22);
	}
	p {
		margin: 0;
	}
	.kicker {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--muted-on-dark);
	}
	.when {
		margin-top: 6px;
		font: 600 clamp(18px, 2.8vw, 21px) / 1.3 var(--font-display);
		color: #fff;
	}
	.units {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin: 20px 0 0;
	}
	.unit {
		display: flex;
		flex-direction: column-reverse;
		gap: 4px;
		padding: 0 clamp(10px, 3vw, 24px);
		border-left: 1px solid rgba(167, 187, 214, 0.22);
	}
	.unit:first-child {
		padding-left: 0;
		border-left: 0;
	}
	.value {
		margin: 0;
		font: 600 clamp(26px, 6vw, 38px) / 1 var(--font-display);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		color: #fff;
	}
	.label {
		font-size: 12px;
		letter-spacing: 0.06em;
		color: var(--muted-on-dark);
	}
	.live {
		margin-top: 12px;
		font-weight: 700;
		color: #fff;
	}
</style>
