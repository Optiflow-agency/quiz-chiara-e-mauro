<script lang="ts" module>
	export type Phase = 'checking' | 'success' | 'error';

	/** Time from mount until every digit has locked (the parent waits at least this long). */
	export const LOCK_MS = 1300;
	/** From `success` until the blue flood has covered the screen. */
	export const SUCCESS_MS = 1650;
	/** From `error` until the shake has finished. */
	export const ERROR_MS = 650;
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { messages as m } from '$lib/content/messages.it';

	/** Full-screen code check: the digits scramble and lock one by one, then a check or a shake. */
	let { digits, phase }: { digits: string; phase: Phase } = $props();

	const FIRST_LOCK = 380;
	const STEP = (LOCK_MS - FIRST_LOCK) / 5;

	const s = m.profile.signIn;
	const target = $derived(digits.split('').slice(0, 6));
	let shown = $state(['0', '0', '0', '0', '0', '0']);
	let locked = $state([false, false, false, false, false, false]);

	onMount(() => {
		if (prefersReducedMotion.current) {
			shown = [...target];
			locked = locked.map(() => true);
			return;
		}
		const tick = setInterval(() => {
			shown = shown.map((d, i) => (locked[i] ? d : String(Math.floor(Math.random() * 10))));
		}, 45);
		const timers = target.map((d, i) =>
			setTimeout(
				() => {
					shown[i] = d;
					locked[i] = true;
					if (i === target.length - 1) clearInterval(tick);
				},
				FIRST_LOCK + i * STEP
			)
		);
		return () => {
			clearInterval(tick);
			timers.forEach(clearTimeout);
		};
	});

	const label = $derived(
		phase === 'success' ? s.verified : phase === 'error' ? s.wrongCode : s.checking
	);
</script>

<div
	class="check"
	class:reduced={prefersReducedMotion.current}
	data-phase={phase}
	transition:fade={{ duration: prefersReducedMotion.current ? 100 : 220 }}
>
	<div class="stage">
		<div class="cells" aria-hidden="true">
			{#if phase === 'checking'}
				<span class="scan"></span>
			{/if}
			{#each shown as d, i (i)}
				<span class="cell" class:locked={locked[i]} style="--i: {i}">
					<span class="digit">{d}</span>
					<span class="bar"></span>
				</span>
			{/each}
		</div>

		<div class="seal" aria-hidden="true">
			<span class="ring"></span>
			<svg class="tick" viewBox="0 0 48 48" width="48" height="48">
				<path
					d="M13 25.5l7.5 7.5L35 17"
					fill="none"
					stroke-width="4.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<p class="label" role="status" aria-live="polite">{label}</p>
	</div>
	<span class="flood" aria-hidden="true"></span>
</div>

<style>
	.check {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: var(--navy-deep) var(--grid);
		color: #fff;
	}
	.stage {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 40px;
		padding: 0 var(--gutter);
	}

	/* Digits */
	.cells {
		position: relative;
		display: flex;
		gap: clamp(6px, 1.6vw, 14px);
		transition:
			transform 520ms var(--ease-out),
			opacity 300ms ease;
	}
	.cell {
		position: relative;
		display: grid;
		place-items: center;
		width: clamp(42px, 11vw, 76px);
		height: clamp(58px, 15vw, 100px);
		border-radius: var(--radius-field);
		background: rgba(255, 255, 255, 0.06);
		box-shadow: inset 0 0 0 1.5px rgba(167, 187, 214, 0.25);
		transition: transform 520ms var(--ease-out);
	}
	.digit {
		font:
			700 clamp(28px, 7.5vw, 52px) / 1 ui-monospace,
			Menlo,
			Consolas,
			monospace;
		opacity: 0.45;
		filter: blur(0.6px);
	}
	.locked .digit {
		opacity: 1;
		filter: none;
		animation: pop 420ms var(--ease-out);
	}
	.bar {
		position: absolute;
		left: 18%;
		right: 18%;
		bottom: 10px;
		height: 3px;
		border-radius: 2px;
		background: var(--accent-on-dark);
		transform: scaleX(0);
		transition: transform 360ms var(--ease-out);
	}
	.locked .bar {
		transform: scaleX(1);
	}
	.scan {
		position: absolute;
		top: -14px;
		bottom: -14px;
		left: 0;
		width: 64px;
		background: linear-gradient(90deg, transparent, rgba(111, 163, 255, 0.45), transparent);
		mix-blend-mode: screen;
		animation: scan 900ms cubic-bezier(0.65, 0, 0.35, 1) infinite alternate;
		pointer-events: none;
	}

	/* Success: the digits close in, the seal appears, the screen floods blue. */
	.seal {
		position: absolute;
		top: calc(50% - 64px);
		left: calc(50% - 46px);
		display: grid;
		place-items: center;
		width: 92px;
		height: 92px;
		opacity: 0;
		transform: scale(0.4);
		transition:
			opacity 200ms ease,
			transform 520ms var(--ease-out);
	}
	.ring {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background: var(--blue);
		box-shadow: 0 0 0 10px rgba(111, 163, 255, 0.18);
	}
	.tick {
		position: relative;
		stroke: #fff;
		clip-path: inset(0 100% 0 0);
	}
	.label {
		min-height: 1.4em;
		font: 600 clamp(17px, 2.6vw, 21px) var(--font-display);
		letter-spacing: -0.01em;
		color: var(--text-on-dark);
	}
	.flood {
		position: absolute;
		inset: 0;
		background: var(--blue);
		clip-path: circle(0% at 50% 46%);
		pointer-events: none;
	}

	[data-phase='success'] .cell {
		transform: translateX(calc((2.5 - var(--i)) * 100%)) scale(0.2);
	}
	[data-phase='success'] .cells {
		opacity: 0;
	}
	[data-phase='success'] .seal {
		opacity: 1;
		transform: scale(1);
		transition-delay: 120ms;
	}
	[data-phase='success'] .tick {
		animation: draw 360ms var(--ease-out) 300ms forwards;
	}
	[data-phase='success'] .flood {
		animation: flood 560ms cubic-bezier(0.7, 0, 0.84, 0) 1080ms forwards;
	}

	/* Error: red and a shake. */
	[data-phase='error'] .cell {
		box-shadow: inset 0 0 0 1.5px var(--error-on-dark);
		animation: shake 420ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
	}
	[data-phase='error'] .bar {
		background: var(--error-on-dark);
	}
	[data-phase='error'] .label {
		color: var(--error-on-dark);
	}

	@keyframes pop {
		0% {
			transform: scale(1.35) translateY(-6px);
		}
		100% {
			transform: none;
		}
	}
	@keyframes scan {
		from {
			transform: translateX(-40px);
		}
		to {
			transform: translateX(calc(clamp(42px, 11vw, 76px) * 6 + clamp(6px, 1.6vw, 14px) * 5 - 24px));
		}
	}
	@keyframes draw {
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	@keyframes flood {
		to {
			clip-path: circle(150% at 50% 46%);
		}
	}
	@keyframes shake {
		10%,
		90% {
			transform: translateX(-2px);
		}
		20%,
		80% {
			transform: translateX(4px);
		}
		30%,
		50%,
		70% {
			transform: translateX(-8px);
		}
		40%,
		60% {
			transform: translateX(8px);
		}
	}

	/* Reduced motion: nothing travels, the states just swap. */
	.reduced *,
	.reduced *::before {
		animation: none !important;
		transition: opacity 100ms ease !important;
	}
	.reduced[data-phase='success'] .cell {
		transform: none;
	}
	.reduced[data-phase='success'] .seal {
		transform: none;
	}
	.reduced[data-phase='success'] .tick {
		clip-path: none;
	}
</style>
