/**
 * The contract between the survey page and `POST /api/eventi`. Nothing here identifies anyone:
 * the server ties `events` to a journey from the session, never from the payload.
 */

export const DEVICES = ['smartphone', 'tablet', 'computer'] as const;
export type Device = (typeof DEVICES)[number];

/** How a question screen was left. `unknown` / `withheld` are the two escapes. */
export const OUTCOMES = ['answered', 'skipped', 'unknown', 'withheld'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * Synthetic counters besides the screen ids of `buildScreens` (`welcome`, `section-<sheet>`,
 * `<sheet>`, `<sheet>.<field>`, `gate`, `end`): `visit` once per page load, `start` once when the
 * first question is left answered.
 */
export const SYNTHETIC_SCREENS = ['visit', 'start'] as const;

/** A screen left, with its visible time. Accepted only with a session and consent on record. */
export interface ScreenEvent {
	screen: string;
	/** Question screens only. */
	outcome?: Outcome;
	/** Whole seconds, capped at MAX_DURATION_S. */
	duration: number;
}

export interface EventBatch {
	device: Device;
	/** Screens reached (anonymous daily counters), consent or not. */
	reached: string[];
	events: ScreenEvent[];
}

export const MAX_DURATION_S = 300;
/** Upper bound on `reached.length + events.length` in one batch. */
export const MAX_BATCH_ITEMS = 20;
export const MAX_BODY_BYTES = 4096;
