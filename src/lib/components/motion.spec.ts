import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { buildScreens } from '$lib/survey/screens';
import { chooseTransition, easeOut } from './motion';

const screens = buildScreens(catalogue, { S01: { children: 'one' } });
const at = (id: string) => screens.find((s) => s.id === id)!;
const rect = { top: 10, left: 10, right: 100, bottom: 60 };

describe('chooseTransition', () => {
	it('rises between questions of one sheet', () => {
		const plan = chooseTransition(at('S01.age_band'), at('S01.marital'), {
			back: false,
			rect: null
		});
		expect(plan.kind).toBe('rise');
	});

	it('grows a following question from the chosen row, but never when going back', () => {
		const follow = at('S01.children_independent');
		expect(chooseTransition(at('S01.children'), follow, { back: false, rect }).kind).toBe('grow');
		expect(chooseTransition(follow, at('S01.children'), { back: true, rect }).kind).toBe('rise');
	});

	it('wipes across sheets and chapters, and fades around the intro', () => {
		expect(chooseTransition(at('S01.children'), at('S02'), { back: false, rect }).kind).toBe(
			'wipe'
		);
		expect(chooseTransition(at('S01'), at('S01.age_band'), { back: false, rect }).kind).toBe(
			'fade'
		);
		expect(chooseTransition(at('S01.age_band'), at('S01'), { back: true, rect }).kind).toBe('fade');
	});
});

describe('easeOut', () => {
	it('runs from 0 to 1 and decelerates', () => {
		expect(easeOut(0)).toBe(0);
		expect(easeOut(1)).toBe(1);
		expect(easeOut(0.2)).toBeGreaterThan(0.5);
	});
});
