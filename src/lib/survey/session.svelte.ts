import { setValue, type Answers, type FieldValue } from './answers';
import type { Catalogue } from './catalogue';
import { pruneHidden } from './prune';
import { sanitizeAnswers } from './sanitize';
import { buildScreens, resumeScreen, type Screen } from './screens';

/** The subset of Web Storage the session needs; injected so tests can pass a fake. */
export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'mappa-finanziaria:v4';

/** Removes the device copy of the answers (used after the respondent withdraws or deletes the account). */
export function clearStoredAnswers(storage: Pick<Storage, 'removeItem'>): void {
	storage.removeItem(STORAGE_KEY);
}

interface Persisted {
	answers: Answers;
}

/**
 * Holds the respondent's answers. Until consent is recorded server-side nothing leaves the
 * browser: the only persistence is the injected storage (device-local).
 */
export class SurveySession {
	answers = $state<Answers>({});

	/** Every screen for the current answers, including those still behind the gate. */
	readonly screens = $derived.by(() => buildScreens(this.catalogue, this.answers));

	constructor(
		readonly catalogue: Catalogue,
		private readonly storage: KeyValueStorage | null,
		/** Whether the verified respondent's consent is on record (comes from the server). */
		private readonly hasConsent: () => boolean,
		/** The respondent's answers stored on the server (already validated); per sheet they win over the device copy. */
		serverAnswers: Answers = {}
	) {
		this.restore();
		if (Object.keys(serverAnswers).length > 0) {
			this.answers = { ...this.answers, ...serverAnswers };
			pruneHidden(this.catalogue, this.answers);
			this.persist();
		}
	}

	get gateIndex(): number {
		return this.screens.findIndex((screen) => screen.kind === 'gate');
	}

	get unlocked(): boolean {
		return this.hasConsent() || this.gateIndex === -1;
	}

	/** Screens the respondent can reach: everything past the gate stays hidden until consent. */
	get visibleScreens(): Screen[] {
		return this.unlocked ? this.screens : this.screens.slice(0, this.gateIndex + 1);
	}

	private get questions() {
		return this.screens.filter(
			(screen): screen is Extract<Screen, { kind: 'question' }> => screen.kind === 'question'
		);
	}

	get questionCount(): number {
		return this.questions.length;
	}

	get answeredCount(): number {
		return this.questions.filter((q) => this.answers[q.sheet.id]?.[q.field.id] !== undefined)
			.length;
	}

	/** Where to start: the first unanswered question the respondent can reach. */
	get resumeScreen(): Screen {
		return resumeScreen(this.visibleScreens, this.answers);
	}

	setValue(sheetId: string, fieldId: string, value: FieldValue | undefined): void {
		setValue(this.answers, sheetId, fieldId, value);
		pruneHidden(this.catalogue, this.answers);
		this.persist();
	}

	private restore(): void {
		try {
			const raw = this.storage?.getItem(STORAGE_KEY);
			if (!raw) return;
			const saved = JSON.parse(raw) as Persisted;
			this.answers = sanitizeAnswers(this.catalogue, saved.answers) ?? {};
		} catch {
			// Corrupt or unavailable storage: start from a clean, unanswered state.
			this.answers = {};
		}
	}

	private persist(): void {
		try {
			const snapshot: Persisted = { answers: $state.snapshot(this.answers) };
			this.storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
		} catch {
			// Storage full or blocked: the in-memory session keeps working.
		}
	}
}
