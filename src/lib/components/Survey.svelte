<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { afterNavigate, pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EndNode from './EndNode.svelte';
	import Frame from './Frame.svelte';
	import GateNode from './GateNode.svelte';
	import Icon from './Icon.svelte';
	import QuestionScreen from './QuestionScreen.svelte';
	import SectionNode from './SectionNode.svelte';
	import SheetIntro from './SheetIntro.svelte';
	import { chooseTransition, enter, leave, makeMorph, type Plan, type Rect } from './motion';
	import { messages as m } from '$lib/content/messages.it';
	import type { FieldValue } from '$lib/survey/answers';
	import type { SurveySession } from '$lib/survey/session.svelte';
	import { firstGap, mustAnswer, type Screen } from '$lib/survey/screens';
	import type { SyncStatus } from '$lib/survey/sync';
	import type { Tracker } from '$lib/metrics/tracker';

	let {
		session,
		hasSession,
		syncStatus,
		tracker,
		onSubmit
	}: {
		session: SurveySession;
		hasSession: boolean;
		syncStatus: SyncStatus;
		tracker: Tracker | null;
		onSubmit: () => Promise<void>;
	} = $props();

	const AUTO_ADVANCE_MS = 300;

	let stage: HTMLElement;
	// Shallow routing is only usable once the router has started; until then the SSR'd first screen stays.
	let ready = $state(false);
	afterNavigate(() => (ready = true));

	/**
	 * A stable order of every screen id seen so far, vanished ones included, so a screen that
	 * disappeared (a conditional question, a stale history entry) can fall back to the nearest
	 * following one.
	 */
	let canon: string[] = [];
	function mergeOrder(known: string[], ids: string[]): string[] {
		const out = [...known];
		ids.forEach((id, i) => {
			if (out.includes(id)) return;
			out.splice(i > 0 ? out.indexOf(ids[i - 1]) + 1 : 0, 0, id);
		});
		return out;
	}

	function resolveScreen(wanted: string | undefined, visible: Screen[]): Screen {
		if (!wanted) return visible[0];
		const hit = visible.find((s) => s.id === wanted);
		if (hit) return hit;
		const at = canon.indexOf(wanted);
		if (at !== -1) {
			for (const id of canon.slice(at + 1)) {
				const next = visible.find((s) => s.id === id);
				if (next) return next;
			}
		}
		return visible[visible.length - 1];
	}

	// The row the respondent just chose, captured before leaving so the next question can grow from it.
	let pendingRect: Rect | null = null;
	let lastScreen: Screen | undefined;
	let lastPlan: Plan = { kind: 'fade', back: false, rect: null };
	let lastWanted: string | undefined;
	let initial = true;

	/**
	 * The screen to show, resolved by id, and how it replaces the previous one. The plan is fixed
	 * here, once per change of screen, so entering and leaving screens read the same one (back and
	 * forward both work, whether the move came from a button or the browser's history).
	 */
	const view = $derived.by(() => {
		const visible = session.visibleScreens;
		canon = mergeOrder(
			canon,
			session.screens.map((s) => s.id)
		);
		const wanted = ready ? page.state.screen : undefined;
		const resolved = resolveScreen(wanted, visible);
		// Nothing past an unanswered question is reachable, whatever the history entry asks for.
		const gap = firstGap(visible, session.answers);
		const screen =
			gap !== -1 && visible.findIndex((s) => s.id === resolved.id) > gap ? visible[gap] : resolved;
		if (screen.id !== lastScreen?.id) {
			const back = lastScreen ? canon.indexOf(screen.id) < canon.indexOf(lastScreen.id) : false;
			lastPlan = chooseTransition(lastScreen, screen, { back, rect: pendingRect });
			initial = lastWanted === undefined;
			lastScreen = screen;
			pendingRect = null;
		}
		lastWanted = wanted;
		const index = visible.findIndex((s) => s.id === screen.id);
		return { screen, plan: lastPlan, initial, visible, index };
	});

	const current = $derived(view.screen);
	const previous = $derived(view.visible[view.index - 1]);
	const following = $derived(view.visible[view.index + 1]);
	const blocked = $derived(
		current.kind === 'question' &&
			mustAnswer(current.field) &&
			session.answers[current.sheet.id]?.[current.field.id] === undefined
	);

	// First placement, and moves forced by a screen that no longer exists, replace the history entry.
	$effect(() => {
		if (!ready) return;
		const wanted = page.state.screen;
		const id = wanted ? current.id : untrack(() => session.resumeScreen.id);
		if (id !== wanted) replaceState('', { ...page.state, screen: id });
	});

	// Screen statistics: each screen shown is reported, with a reader for its answer if it is a question.
	$effect(() => {
		const screen = current;
		untrack(() =>
			tracker?.enter(
				screen.id,
				screen.kind === 'question'
					? () => session.answers[screen.sheet.id]?.[screen.field.id]
					: undefined
			)
		);
	});

	const tone = $derived(current.kind === 'intro' || current.kind === 'question' ? 'light' : 'dark');
	const sectionTitle = $derived.by(() => {
		if (current.id === 'welcome' || current.kind === 'gate' || current.kind === 'end') return '';
		for (let i = view.index; i >= 0; i--) {
			const screen = view.visible[i];
			if (screen.kind === 'section' && screen.id !== 'welcome') return screen.content.title;
		}
		return '';
	});
	// Questions already passed over all of them; intros and chapter screens keep the last one's value.
	const progress = $derived.by(() => {
		const total = Math.max(session.questionCount, 1);
		const before = view.visible
			.slice(0, view.index)
			.filter((screen) => screen.kind === 'question').length;
		return Math.min(before / total, 1);
	});

	const saveLine = $derived.by(() => {
		if (!session.unlocked) return { text: m.saveStatus.local, busy: false, bad: false };
		const { state, problem } = syncStatus;
		return {
			text: problem
				? `${m.saveStatus.saved} · ${m.saveStatus.problem[problem]}`
				: m.saveStatus.saved,
			busy: state === 'saving' || state === 'retrying',
			bad: state === 'blocked'
		};
	});

	// Auto-advance after a single-choice pick; any other change, step or unmount cancels it.
	let autoTimer: ReturnType<typeof setTimeout> | undefined;
	const cancelAuto = () => clearTimeout(autoTimer);
	$effect(() => cancelAuto);

	function answer(screen: Extract<Screen, { kind: 'question' }>, value: FieldValue | undefined) {
		session.setValue(screen.sheet.id, screen.field.id, value);
		cancelAuto();
		const single = screen.field.type === 'single' || screen.field.type === 'band';
		if (single && value !== undefined) {
			autoTimer = setTimeout(() => {
				if (current.id === screen.id) next();
			}, AUTO_ADVANCE_MS);
		}
	}

	function selectedRect(): Rect | null {
		const row = stage.querySelector('.slot:not([data-leaving]) .f-option.is-selected');
		if (!row) return null;
		const { top, left, right, bottom } = row.getBoundingClientRect();
		return { top, left, right, bottom };
	}

	function go(target: Screen, how: 'push' | 'replace', rect: Rect | null = null) {
		cancelAuto();
		pendingRect = rect;
		window.scrollTo(0, 0);
		const step = (page.state.step ?? 0) + (how === 'push' ? 1 : 0);
		(how === 'push' ? pushState : replaceState)('', { screen: target.id, step });
	}

	function next() {
		if (following && !blocked) go(following, 'push', selectedRect());
	}

	function back() {
		cancelAuto();
		// An earlier entry of this survey exists: the browser's own back keeps history honest.
		if ((page.state.step ?? 0) > 0) history.back();
		else if (previous) go(previous, 'replace');
	}

	async function afterGate() {
		await tick();
		const gate = view.visible.findIndex((s) => s.kind === 'gate');
		const target = view.visible[gate + 1];
		if (target) go(target, 'push');
	}

	// After each step the new screen's heading takes focus, so keyboard and screen reader users arrive at it.
	let focused: string | undefined;
	$effect(() => {
		const id = current.id;
		if (focused === id) return;
		const first = focused === undefined;
		focused = id;
		if (first || untrack(() => view.initial)) return;
		let cancelled = false;
		tick().then(() => {
			if (cancelled) return;
			window.scrollTo(0, 0);
			stage
				.querySelector<HTMLElement>('.slot:not([data-leaving]) [data-focus]')
				?.focus({ preventScroll: true });
		});
		return () => (cancelled = true);
	});

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) return;
		if (event.altKey || event.shiftKey) return;
		if (current.kind === 'gate' || current.kind === 'end') return;
		const target = event.target instanceof Element ? event.target : null;
		if (target?.closest('a, button, summary, form, header')) return;
		const inText = target?.closest('textarea');
		if (inText ? !(event.metaKey || event.ctrlKey) : event.metaKey || event.ctrlKey) return;
		event.preventDefault();
		next();
	}

	// Cue to move on: an answered question, an unlocked gate, or a pause on a chapter title.
	const SECTION_PAUSE_MS = 5000;
	let paused = $state(false);
	$effect(() => {
		paused = false;
		if (current.kind !== 'section') return;
		const timer = setTimeout(() => (paused = true), SECTION_PAUSE_MS);
		return () => clearTimeout(timer);
	});
	const cueNext = $derived.by(() => {
		if (current.kind === 'section') return paused;
		if (current.kind === 'gate') return session.unlocked;
		if (current.kind !== 'question') return false;
		return session.answers[current.sheet.id]?.[current.field.id] !== undefined;
	});

	/** The hero carries its own call to action: the cue plays there, and on the dock everywhere else. */
	const ctaCue = $derived(cueNext && current.kind === 'section' && Boolean(current.content.cta));
	const dockCue = $derived(cueNext && !ctaCue && following !== undefined);

	// The sheet prompt flies between a sheet's intro and its first question.
	const morph = makeMorph();
	const noMorph = makeMorph();
	const morphs = (screen: Screen) =>
		screen.kind === 'intro' ||
		(screen.kind === 'question' &&
			view.visible[view.visible.findIndex((s) => s.id === screen.id) - 1]?.kind === 'intro');
</script>

<svelte:window {onkeydown} />

<div class="shell" data-tone={tone} data-kind={current.kind}>
	<header class="top">
		<span class="brand">{m.brand.before}<em>{m.brand.accent}</em><span>{m.brand.plus}</span></span>
		<span class="where">{sectionTitle}</span>
		<a class="chip" href={resolve('/profilo')}>
			<Icon name="user" size={16} />
			<span class="chip__label">{m.nav.profile}</span>
		</a>
		<!--
			"Esci" back to the event site, disabled for now. Why it exists: every step is a
			browser history entry, so the browser's Back no longer leaves the survey (it would
			take one press per screen seen); this is the explicit way out. Leaving loses
			nothing: answers stay saved and the survey resumes at the first unanswered question.
		<a class="chip" href={m.eventUrl} rel="external" aria-label={m.nav.exitLabel}>
			<Icon name="exit" size={16} />
			<span class="chip__label">{m.nav.exit}</span>
		</a>
		-->
		<div
			class="progress"
			role="progressbar"
			aria-label={m.nav.progress}
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(progress * 100)}
		>
			<div class="progress__fill" style="transform: scaleX({progress})"></div>
		</div>
	</header>

	<p class="save" class:save--bad={saveLine.bad} role="status" aria-live="polite">
		{#if saveLine.busy}
			<span class="spinner" aria-hidden="true"></span>
		{:else}
			<Icon name={saveLine.bad ? 'alert' : 'check'} size={14} />
		{/if}
		{saveLine.text}
	</p>

	<main class="stage" bind:this={stage}>
		{#key current.id}
			{@const screen = current}
			<div class="slot" data-tone={tone} in:enter|global={view.plan} out:leave|global={view.plan}>
				{#if screen.kind === 'section'}
					<Frame tone="dark" labelledby="{screen.id}-title">
						<SectionNode id={screen.id} content={screen.content} cue={ctaCue} onNext={next} />
					</Frame>
				{:else if screen.kind === 'intro'}
					<Frame tone="light" labelledby="{screen.id}-title">
						<SheetIntro
							sheet={screen.sheet}
							morph={morphs(screen) ? morph : noMorph}
							onnext={next}
						/>
					</Frame>
				{:else if screen.kind === 'question'}
					<Frame tone="light">
						<QuestionScreen
							sheet={screen.sheet}
							field={screen.field}
							catalogue={session.catalogue}
							answers={session.answers}
							morph={morphs(screen) ? morph : noMorph}
							canBack={previous !== undefined}
							canNext={!blocked}
							onchange={(value) => answer(screen, value)}
							onback={back}
							onnext={next}
						/>
					</Frame>
				{:else if screen.kind === 'gate'}
					<Frame tone="dark" labelledby="gate-title">
						<GateNode {session} {hasSession} onGranted={afterGate} />
					</Frame>
				{:else}
					<Frame tone="flat" labelledby="end-title">
						<EndNode {session} {syncStatus} {onSubmit} />
					</Frame>
				{/if}
			</div>
		{/key}
	</main>

	<nav class="dock" aria-label={m.nav.progress}>
		<button type="button" aria-label={m.nav.dockPrevious} disabled={!previous} onclick={back}>
			<Icon name="up" />
		</button>
		<button
			type="button"
			aria-label={m.nav.dockNext}
			class:cue={dockCue}
			disabled={!following || blocked}
			onclick={next}
		>
			<Icon name="down" />
		</button>
	</nav>
</div>

<style>
	.shell {
		--chrome-fg: #fff;
		--chrome-muted: var(--muted-on-dark);
		--chrome-line: rgba(255, 255, 255, 0.35);
		--chrome-track: rgba(255, 255, 255, 0.14);
		--chrome-bg: var(--navy);
		--chrome-plus: var(--accent-on-dark);
	}
	.shell[data-tone='light'] {
		--chrome-fg: var(--navy);
		--chrome-muted: var(--muted);
		--chrome-line: rgba(11, 37, 69, 0.3);
		--chrome-track: var(--line);
		--chrome-bg: #fff;
		--chrome-plus: var(--blue);
	}
	.top {
		position: fixed;
		inset: 0 0 auto 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: calc(16px + env(safe-area-inset-top)) var(--gutter) 14px;
		background: var(--chrome-bg);
		color: var(--chrome-fg);
		transition:
			background 0.3s,
			color 0.3s;
	}
	/* The wordmark never wraps: a taller bar would cover the save line below it. */
	.brand {
		flex: none;
		font: 600 15px var(--font-display);
		letter-spacing: -0.01em;
		white-space: nowrap;
	}
	/* Lighter italic, as in the event site's logo. */
	.brand em {
		font-style: italic;
		font-weight: 400;
	}
	.brand span {
		margin-left: 1px;
		color: var(--chrome-plus);
	}
	.where {
		margin-left: auto;
		overflow: hidden;
		min-width: 0;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--chrome-muted);
	}
	.chip {
		position: relative;
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
		color: inherit;
		text-underline-offset: 3px;
	}
	/* The bar stays slim; the tap target still reaches 44px. */
	.chip::after {
		content: '';
		position: absolute;
		inset: -14px -8px;
	}
	@media (max-width: 640px) {
		.where {
			display: none;
		}
		.top {
			gap: 8px;
		}
		.brand {
			margin-right: auto;
		}
		/* Icons only; the names stay for assistive technology. */
		.chip__label {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
		}
		.chip {
			width: 24px;
			justify-content: center;
		}
		.chip::after {
			inset: -10px -8px;
		}
	}
	.save {
		position: fixed;
		z-index: 9;
		top: calc(56px + env(safe-area-inset-top));
		left: var(--gutter);
		right: var(--gutter);
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		color: var(--chrome-muted);
		pointer-events: none;
		transition: color 0.3s;
	}
	.save--bad {
		color: var(--error-on-dark);
	}
	.shell[data-tone='light'] .save--bad {
		color: var(--error);
	}
	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2.4s;
		}
	}
	.progress {
		position: absolute;
		inset: auto 0 0 0;
		height: 3px;
		background: var(--chrome-track);
	}
	.progress__fill {
		height: 100%;
		background: var(--blue);
		transform-origin: left;
		transition: transform 0.5s var(--ease-out);
	}
	/* One screen at rest; the leaving and arriving ones share the cell so neither pushes the other. */
	.stage {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		overflow-x: clip;
		transition: background 0.3s;
	}
	/* The ground behind a leaving screen: no navy strip shows through a wipe between white screens. */
	.shell[data-tone='light'] .stage {
		background: #fff;
	}
	.slot {
		display: grid;
		grid-area: 1 / 1;
		min-width: 0;
	}
	.slot[data-tone='light'] {
		background: #fff;
	}
	.dock {
		position: fixed;
		z-index: 10;
		right: var(--gutter);
		bottom: calc(20px + env(safe-area-inset-bottom));
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px;
		border: 1px solid var(--chrome-line);
		border-radius: 999px;
		background: var(--chrome-bg);
		color: var(--chrome-fg);
		box-shadow: 0 12px 28px -14px rgba(7, 26, 51, 0.5);
		transition:
			background 0.3s,
			color 0.3s,
			border-color 0.3s;
	}
	.dock button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: var(--blue);
		color: #fff;
		cursor: pointer;
		transition: background 0.2s;
	}
	.dock button:hover:not(:disabled) {
		background: var(--blue-dark);
	}
	/* A soft ring breathing out of the down button; a still ring for reduced motion. */
	.dock button.cue {
		animation: cue 1.5s var(--ease-out) infinite;
	}
	/* Two rings a beat apart, and a small nudge of the button itself. */
	@keyframes cue {
		0% {
			transform: scale(1);
			box-shadow:
				0 0 0 0 rgba(30, 111, 232, 0.8),
				0 0 0 0 rgba(30, 111, 232, 0.5);
		}
		20% {
			transform: scale(1.08);
		}
		40% {
			transform: scale(1);
		}
		100% {
			box-shadow:
				0 0 0 18px rgba(30, 111, 232, 0),
				0 0 0 30px rgba(30, 111, 232, 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dock button.cue {
			animation: none !important;
			box-shadow: 0 0 0 4px rgba(30, 111, 232, 0.6);
		}
	}
	@media (max-width: 640px) {
		/* The sticky action row under each question replaces the dock there. */
		.shell[data-kind='question'] .dock {
			display: none;
		}
	}
	.dock button:disabled {
		background: var(--chrome-track);
		color: var(--chrome-muted);
		cursor: not-allowed;
	}
</style>
