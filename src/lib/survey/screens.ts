import { messages as m } from '$lib/content/messages.it';
import type { Answers } from './answers';
import type { Catalogue, CatalogueField, CatalogueSheet } from './catalogue';
import { evaluate, visibleSheets } from './conditions';
import type { SectionContent } from './types';

/**
 * One full-viewport step of the survey. Sheets are not shown as such: each becomes an intro
 * screen (its prompt and help) followed by one screen per visible question.
 */
export type Screen =
	| { kind: 'section'; id: string; content: SectionContent }
	| { kind: 'intro'; id: string; sheet: CatalogueSheet }
	| {
			kind: 'question';
			/** `<sheet id>.<field id>` */
			id: string;
			sheet: CatalogueSheet;
			field: CatalogueField;
			/** Shown because of an answer given earlier in the same sheet. */
			follows: boolean;
	  }
	| { kind: 'gate'; id: 'gate' }
	| { kind: 'end'; id: 'end' };

/** The consent gate sits right after the questions of the sheet with this id. */
export const GATE_AFTER = 'S03';

function sectionContent(title: string): SectionContent {
	const accent = title.split(' ').at(-1);
	return { title, accent };
}

/** Whether a field's rule names another field of its own sheet. */
function followsSameSheet(sheet: CatalogueSheet, field: CatalogueField): boolean {
	return new RegExp(`(^|\\s)${sheet.id}\\.\\w+`).test(field.display_when);
}

/**
 * The screens for the current answers: welcome, then for each visible sheet its section's title
 * screen (on a change of section), its intro and its visible questions, the consent gate, and the
 * end. Conditional sheets and questions come and go with the answers.
 */
export function buildScreens(
	catalogue: Catalogue,
	answers: Answers,
	gateAfter: string = GATE_AFTER
): Screen[] {
	const screens: Screen[] = [{ kind: 'section', id: 'welcome', content: m.welcome }];
	let section: string | undefined;
	for (const sheet of visibleSheets(catalogue, answers)) {
		if (sheet.section && sheet.section !== section) {
			section = sheet.section;
			screens.push({
				kind: 'section',
				id: `section-${sheet.id}`,
				content: sectionContent(section)
			});
		}
		screens.push({ kind: 'intro', id: sheet.id, sheet });
		for (const field of sheet.fields) {
			if (!evaluate(field.display_when, answers)) continue;
			screens.push({
				kind: 'question',
				id: `${sheet.id}.${field.id}`,
				sheet,
				field,
				follows: followsSameSheet(sheet, field)
			});
		}
		if (sheet.id === gateAfter) screens.push({ kind: 'gate', id: 'gate' });
	}
	screens.push({ kind: 'end', id: 'end' });
	return screens;
}

/** A question must be answered, an escape included, before moving past it; free text may stay blank. */
export const mustAnswer = (field: CatalogueField) => field.type !== 'textarea';

/** The first question that must be answered and is not, or -1: no screen after it can be reached. */
export function firstGap(screens: Screen[], answers: Answers): number {
	return screens.findIndex(
		(s) =>
			s.kind === 'question' &&
			mustAnswer(s.field) &&
			answers[s.sheet.id]?.[s.field.id] === undefined
	);
}

/**
 * Where a returning respondent lands: the welcome when nothing is answered yet, otherwise the
 * first unanswered question (or its sheet's intro when it opens the sheet), else the last screen.
 */
export function resumeScreen(screens: Screen[], answers: Answers): Screen {
	const answered = (s: Screen) =>
		s.kind === 'question' && answers[s.sheet.id]?.[s.field.id] !== undefined;
	if (!screens.some(answered)) return screens[0];
	const index = screens.findIndex((s) => s.kind === 'question' && !answered(s));
	if (index === -1) return screens[screens.length - 1];
	const before = screens[index - 1];
	return before?.kind === 'intro' ? before : screens[index];
}
