import { cubicInOut } from 'svelte/easing';
import { crossfade, type TransitionConfig } from 'svelte/transition';
import type { Screen } from '$lib/survey/screens';

/**
 * How one screen replaces another. Chosen by meaning, not rotated:
 * - rise: the next question of the same sheet (T1, "Avanti")
 * - grow: a question that exists because of the previous answer grows out of the chosen row (T2)
 * - wipe: a change of sheet, chapter, gate or end (T3), a horizontal wipe
 * - fade: plain crossfade (morphing heading, forced moves, first placement)
 */
export type Kind = 'rise' | 'grow' | 'wipe' | 'fade';

/** A viewport rectangle (the selected option row the next question grows from). */
export interface Rect {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

export interface Plan {
	kind: Kind;
	/** Moving to an earlier screen: the forward motion mirrored, and faster. */
	back: boolean;
	rect: Rect | null;
}

const sheetOf = (screen: Screen | undefined) =>
	screen && (screen.kind === 'intro' || screen.kind === 'question') ? screen.sheet.id : undefined;

/** The transition from one screen to the next. `from` is undefined on the first placement. */
export function chooseTransition(
	from: Screen | undefined,
	to: Screen,
	{ back, rect }: { back: boolean; rect: Rect | null }
): Plan {
	const plan = (kind: Kind, r: Rect | null = null): Plan => ({ kind, back, rect: r });
	if (!from) return plan('fade');
	const sameSheet = sheetOf(from) !== undefined && sheetOf(from) === sheetOf(to);
	// The sheet prompt flies between the intro and its first question: the screens only fade.
	if (sameSheet && (from.kind === 'intro' || to.kind === 'intro')) return plan('fade');
	if (!sameSheet) return plan('wipe');
	if (!back && to.kind === 'question' && to.follows && rect) return plan('grow', rect);
	return plan('rise');
}

// cubic-bezier(0.16, 1, 0.3, 1), the project's --ease-out, solved for x by Newton's method.
const P1X = 0.16;
const P1Y = 1;
const P2X = 0.3;
const P2Y = 1;
const bezier = (a: number, b: number, t: number) =>
	3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
export function easeOut(x: number): number {
	if (x <= 0 || x >= 1) return Math.max(0, Math.min(1, x));
	let t = x;
	for (let i = 0; i < 8; i++) {
		const dx = bezier(P1X, P2X, t) - x;
		const slope = (bezier(P1X, P2X, t + 1e-4) - bezier(P1X, P2X, t - 1e-4)) / 2e-4 || 1;
		t = Math.max(0, Math.min(1, t - dx / slope));
	}
	return bezier(P1Y, P2Y, t);
}

export const reducedMotion = () =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A transition that does nothing (used where a crossfade pair finds no partner). */
export const none = (): TransitionConfig => ({ duration: 0 });

const fade = (duration: number): TransitionConfig => ({
	duration,
	easing: easeOut,
	css: (t) => `opacity: ${t}`
});

// Exits are faster than entrances; going back is about 30% quicker than going forward.
const speed = (plan: Plan) => (plan.back ? 0.7 : 1);

export function enter(node: HTMLElement, plan: Plan): TransitionConfig {
	if (reducedMotion()) return fade(120);
	const k = speed(plan);
	const dir = plan.back ? -1 : 1;
	switch (plan.kind) {
		case 'fade':
			return fade(320);
		case 'wipe':
			return {
				duration: 500 * k,
				easing: easeOut,
				css: (_t, u) =>
					`clip-path: inset(0 ${plan.back ? u * 100 : 0}% 0 ${plan.back ? 0 : u * 100}%); transform: translateX(${dir * u * 3}%)`
			};
		case 'grow': {
			const r = plan.rect!;
			const w = node.offsetWidth;
			const h = node.offsetHeight;
			const from = {
				top: Math.max(0, r.top),
				right: Math.max(0, w - r.right),
				bottom: Math.max(0, h - r.bottom),
				left: Math.max(0, r.left)
			};
			// Slower to start than the other moves, so the growth from the row reads as growth, not a pop.
			return {
				duration: 560,
				easing: cubicInOut,
				css: (_t, u) => {
					const px = (v: number) => `${v * u}px`;
					// Ice (#eaf1fb) fading to white behind the question as it opens.
					const tint = `rgb(${255 - 21 * u}, ${255 - 14 * u}, ${255 - 4 * u})`;
					return `clip-path: inset(${px(from.top)} ${px(from.right)} ${px(from.bottom)} ${px(from.left)} round ${12 * u}px); background-color: ${tint}`;
				}
			};
		}
		case 'rise':
			return {
				duration: 290 * k,
				delay: 60 * k,
				easing: easeOut,
				css: (t, u) => `opacity: ${t}; transform: translateY(${dir * 32 * u}px)`
			};
	}
}

export function leave(node: HTMLElement, plan: Plan): TransitionConfig {
	// The outgoing screen must not take focus or taps while it finishes leaving.
	node.inert = true;
	node.dataset.leaving = '';
	if (reducedMotion()) return fade(100);
	const k = speed(plan);
	const dir = plan.back ? -1 : 1;
	switch (plan.kind) {
		case 'fade':
			return fade(160);
		case 'grow':
			// Stays behind the opening window, dimming, so the new question grows out of it.
			return { duration: 560, easing: cubicInOut, css: (t) => `opacity: ${0.35 + 0.65 * t}` };
		case 'wipe':
			return {
				duration: 250 * k,
				easing: easeOut,
				css: (t, u) => `opacity: ${t}; transform: translateX(${-dir * u * 6}%)`
			};
		case 'rise':
			return {
				duration: 180 * k,
				easing: easeOut,
				css: (t, u) =>
					`opacity: ${t}; transform: translateY(${-dir * 24 * u}px); filter: blur(${4 * u}px)`
			};
	}
}

/** A send/receive pair: the sheet prompt shrinks and flies between the intro and its first question. */
export type Morph = ReturnType<typeof crossfade>;
export const makeMorph = (): Morph =>
	crossfade({ duration: () => (reducedMotion() ? 1 : 450), easing: easeOut, fallback: none });
