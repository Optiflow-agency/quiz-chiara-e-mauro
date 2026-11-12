import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { SurveySession, type KeyValueStorage } from './session.svelte';
import { pruneHidden } from './prune';
import { buildScreens, firstGap, resumeScreen } from './screens';
import type { Answers } from './answers';

function memoryStorage(): KeyValueStorage {
	const data = new Map<string, string>();
	return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const noConsent = () => false;

describe('buildScreens', () => {
	it('gives each sheet an intro and one screen per question, with the gate after S03', () => {
		const ids = buildScreens(catalogue, {}).map((s) => s.id);
		expect(ids.slice(0, 12)).toEqual([
			'welcome',
			'section-S01',
			'S01',
			'S01.age_band',
			'S01.marital',
			'S01.children',
			'S02',
			'S02.property',
			'S03',
			'S03.work',
			'S03.income_role',
			'gate'
		]);
		expect(ids[12]).toBe('section-S05');
		expect(ids.at(-1)).toBe('end');
	});

	it('adds a conditional question when its rule holds, marked as following', () => {
		const ids = buildScreens(catalogue, {}).map((s) => s.id);
		expect(ids).not.toContain('S01.children_independent');
		const screens = buildScreens(catalogue, { S01: { children: 'one' } });
		const follow = screens[screens.findIndex((s) => s.id === 'S01.children') + 1];
		expect(follow).toMatchObject({ id: 'S01.children_independent', follows: true });
		const first = screens.find((s) => s.id === 'S01.children');
		expect(first).toMatchObject({ follows: false });
	});

	it('does not mark a question shown by another sheet as following', () => {
		const screens = buildScreens(catalogue, { S03: { work: 'employee' } });
		expect(screens.find((s) => s.id === 'S15.tfr')).toMatchObject({ follows: false });
	});

	it('adds a conditional sheet with its intro when its rule holds', () => {
		const without = buildScreens(catalogue, {}).map((s) => s.id);
		expect(without).not.toContain('S12');
		const ids = buildScreens(catalogue, { S10: { investments: 'yes' } }).map((s) => s.id);
		expect(ids[ids.indexOf('S11.pac') + 1]).toBe('S12');
		expect(ids[ids.indexOf('S12') + 1]).toBe('S12.chosen_by');
	});
});

describe('resumeScreen', () => {
	const screens = (answers: Answers) => buildScreens(catalogue, answers);

	it('starts from the welcome when nothing is answered', () => {
		expect(resumeScreen(screens({}), {}).id).toBe('welcome');
	});

	it('lands on the first unanswered question', () => {
		const answers = { S01: { age_band: '26_35' } };
		expect(resumeScreen(screens(answers), answers).id).toBe('S01.marital');
	});

	it('lands on the intro when the first unanswered question opens its sheet', () => {
		const answers = { S01: { age_band: '26_35', marital: 'single', children: 'no' } };
		expect(resumeScreen(screens(answers), answers).id).toBe('S02');
	});

	it('stops at the last reachable screen when everything is answered', () => {
		const answers = {
			S01: { age_band: '26_35', marital: 'single', children: 'no' },
			S02: { property: 'none' },
			S03: { work: 'employee', income_role: 'main' }
		};
		const reachable = screens(answers).slice(
			0,
			screens(answers).findIndex((s) => s.id === 'gate') + 1
		);
		expect(resumeScreen(reachable, answers).id).toBe('gate');
	});
});

describe('firstGap', () => {
	const screens = (answers: Answers) => buildScreens(catalogue, answers);
	const gapId = (answers: Answers) => screens(answers)[firstGap(screens(answers), answers)]?.id;

	it('stops at the first unanswered question', () => {
		expect(gapId({})).toBe('S01.age_band');
		expect(gapId({ S01: { age_band: '26_35' } })).toBe('S01.marital');
	});

	it('counts an escape as an answer', () => {
		expect(gapId({ S01: { age_band: 'withheld' } })).toBe('S01.marital');
	});

	it('lets the free-text questions stay blank', () => {
		const all = screens({}).filter((s) => s.kind === 'question');
		const answers: Answers = {};
		// Answer every visible choice and band question with the escape, the follow-ups included.
		for (let pass = 0; pass < 3; pass++) {
			for (const s of screens(answers)) {
				if (s.kind !== 'question' || s.field.type === 'textarea') continue;
				const value = s.field.type === 'multi' ? ['withheld'] : 'withheld';
				(answers[s.sheet.id] ??= {})[s.field.id] = value;
			}
		}
		expect(all.some((s) => s.kind === 'question' && s.field.type === 'textarea')).toBe(true);
		expect(firstGap(screens(answers), answers)).toBe(-1);
	});
});

describe('pruneHidden', () => {
	it('drops answers to fields that are no longer shown', () => {
		const answers = { S08: { debt_types: ['none'], instalments: 'lt_1000' } };
		pruneHidden(catalogue, answers);
		expect(answers).toEqual({ S08: { debt_types: ['none'] } });
	});

	it('drops sheets once their trigger is gone, and cascades', () => {
		const answers = {
			S10: { investments: 'no' },
			S12: { chosen_by: 'self' }
		};
		pruneHidden(catalogue, answers);
		expect(answers).toEqual({ S10: { investments: 'no' } });
	});

	it('drops a field that depends on another sheet', () => {
		const answers = { S03: { work: 'self_employed' }, S15: { tfr: 'fund', pension_fund: 'no' } };
		pruneHidden(catalogue, answers);
		expect(answers.S15).toEqual({ pension_fund: 'no' });
	});
});

describe('SurveySession', () => {
	it('starts with nothing answered', () => {
		const session = new SurveySession(catalogue, memoryStorage(), noConsent);
		expect(session.answeredCount).toBe(0);
		expect(session.answers).toEqual({});
	});

	it('hides screens after the gate until consent is granted', () => {
		let consented = false;
		const session = new SurveySession(catalogue, memoryStorage(), () => consented);
		expect(session.visibleScreens.map((s) => s.id).at(-1)).toBe('gate');
		consented = true;
		expect(session.visibleScreens).toHaveLength(session.screens.length);
	});

	it('counts answered questions and clears one', () => {
		const session = new SurveySession(catalogue, memoryStorage(), noConsent);
		session.setValue('S01', 'age_band', '26_35');
		session.setValue('S01', 'marital', 'single');
		expect(session.answeredCount).toBe(2);
		session.setValue('S01', 'age_band', undefined);
		expect(session.answeredCount).toBe(1);
		expect(session.answers).toEqual({ S01: { marital: 'single' } });
	});

	it('counts the questions currently shown', () => {
		const session = new SurveySession(catalogue, memoryStorage(), noConsent);
		const before = session.questionCount;
		// Having children opens the follow-up in S01 and the children's pension question in S15.
		session.setValue('S01', 'children', 'one');
		expect(session.questionCount).toBe(before + 2);
	});

	it('forgets hidden answers when a trigger changes', () => {
		const session = new SurveySession(catalogue, memoryStorage(), noConsent);
		session.setValue('S08', 'debt_types', ['car']);
		session.setValue('S08', 'instalments', 'lt_1000');
		session.setValue('S08', 'debt_types', ['none']);
		expect(session.answers.S08).toEqual({ debt_types: ['none'] });
	});

	it('restores answers, dropping unknown sheets and fields', () => {
		const storage = memoryStorage();
		storage.setItem(
			'mappa-finanziaria:v4',
			JSON.stringify({
				answers: {
					S01: { age_band: '26_35', nope: 'x' },
					gone: { a: 'x' }
				}
			})
		);
		const session = new SurveySession(catalogue, storage, noConsent);
		expect(session.answers).toEqual({ S01: { age_band: '26_35' } });
	});

	it('survives corrupt storage and works without storage', () => {
		const storage = memoryStorage();
		storage.setItem('mappa-finanziaria:v4', '{not json');
		expect(new SurveySession(catalogue, storage, noConsent).answers).toEqual({});
		const session = new SurveySession(catalogue, null, noConsent);
		session.setValue('S01', 'age_band', '36_45');
		expect(session.answeredCount).toBe(1);
	});
});

describe('SurveySession with server answers', () => {
	it('lets the server copy win per sheet and keeps sheets only present locally', () => {
		const storage = memoryStorage();
		storage.setItem(
			'mappa-finanziaria:v4',
			JSON.stringify({ answers: { S01: { marital: 'single' }, S02: { property: 'none' } } })
		);
		const server: Answers = { S01: { marital: 'married' } };
		const session = new SurveySession(catalogue, storage, noConsent, server);
		expect(session.answers.S01).toEqual({ marital: 'married' });
		expect(session.answers.S02).toEqual({ property: 'none' });
		const saved = JSON.parse(storage.getItem('mappa-finanziaria:v4')!);
		expect(saved.answers.S01).toEqual({ marital: 'married' });
	});
});
