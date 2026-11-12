import type { SupabaseClient } from '@supabase/supabase-js';
import type { Catalogue } from '$lib/survey/catalogue';
import {
	DEVICES,
	MAX_BATCH_ITEMS,
	MAX_DURATION_S,
	OUTCOMES,
	SYNTHETIC_SCREENS,
	type Device,
	type EventBatch,
	type Outcome,
	type ScreenEvent
} from '$lib/metrics/events';

/** Every screen id the survey can produce, visible or not, plus the synthetic counters. */
export function allowedScreens(catalogue: Catalogue): Set<string> {
	const ids = new Set<string>(['welcome', 'gate', 'end', ...SYNTHETIC_SCREENS]);
	for (const sheet of catalogue.sheets) {
		if (sheet.section) ids.add(`section-${sheet.id}`);
		ids.add(sheet.id);
		for (const field of sheet.fields) ids.add(`${sheet.id}.${field.id}`);
	}
	return ids;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const hasOnly = (o: Record<string, unknown>, keys: string[]) =>
	Object.keys(o).every((k) => keys.includes(k));

function parseEvent(allowed: Set<string>, input: unknown): ScreenEvent | null {
	if (!isRecord(input) || !hasOnly(input, ['screen', 'outcome', 'duration'])) return null;
	const { screen, outcome, duration } = input;
	if (typeof screen !== 'string' || !allowed.has(screen)) return null;
	if (
		!Number.isInteger(duration) ||
		(duration as number) < 0 ||
		(duration as number) > MAX_DURATION_S
	)
		return null;
	const event: ScreenEvent = { screen, duration: duration as number };
	if (outcome !== undefined) {
		if (!screen.includes('.') || !OUTCOMES.includes(outcome as Outcome)) return null;
		event.outcome = outcome as Outcome;
	}
	return event;
}

/** The validated batch, or null when anything about it is off (the whole batch is then dropped). */
export function parseBatch(catalogue: Catalogue, input: unknown): EventBatch | null {
	if (!isRecord(input) || !hasOnly(input, ['device', 'reached', 'events'])) return null;
	const { device, reached, events } = input;
	if (!DEVICES.includes(device as Device)) return null;
	if (!Array.isArray(reached) || !Array.isArray(events)) return null;
	const total = reached.length + events.length;
	if (total < 1 || total > MAX_BATCH_ITEMS) return null;
	const allowed = allowedScreens(catalogue);
	if (!reached.every((s) => typeof s === 'string' && allowed.has(s))) return null;
	const parsed: ScreenEvent[] = [];
	for (const e of events) {
		const event = parseEvent(allowed, e);
		if (!event) return null;
		parsed.push(event);
	}
	return { device: device as Device, reached: reached as string[], events: parsed };
}

/** Adds the screens reached to today's anonymous counters. */
export async function countScreens(
	admin: SupabaseClient,
	version: string,
	batch: EventBatch
): Promise<boolean> {
	if (batch.reached.length === 0) return true;
	const counts = batch.reached.map((screen_id) => ({ screen_id, device: batch.device }));
	const { error } = await admin.rpc('count_screens', { version, counts });
	return !error;
}

/** The user's journey id, created (with its owner row) on first use. */
async function journeyFor(
	admin: SupabaseClient,
	userId: string,
	version: string,
	device: Device
): Promise<string | null> {
	const owned = async () => {
		const { data } = await admin
			.from('survey_journey_owners')
			.select('journey_id')
			.eq('user_id', userId)
			.maybeSingle();
		return (data?.journey_id as string | undefined) ?? null;
	};
	const existing = await owned();
	if (existing) return existing;
	const { data: journey, error } = await admin
		.from('survey_journeys')
		.insert({ catalogue_version: version, start_device: device })
		.select('id')
		.single();
	if (error || !journey) return null;
	const { error: ownerError } = await admin
		.from('survey_journey_owners')
		.insert({ user_id: userId, journey_id: journey.id });
	if (!ownerError) return journey.id as string;
	// Lost a race with a parallel request: drop our orphan and use the winner's journey.
	await admin.from('survey_journeys').delete().eq('id', journey.id);
	return owned();
}

/** Records the events of a consenting respondent in their journey; `now` is injected for tests. */
export async function recordEvents(
	admin: SupabaseClient,
	userId: string,
	version: string,
	batch: EventBatch,
	now: () => Date
): Promise<boolean> {
	if (batch.events.length === 0) return true;
	const journeyId = await journeyFor(admin, userId, version, batch.device);
	if (!journeyId) return false;
	const { error } = await admin.from('survey_journey_events').insert(
		batch.events.map((e) => ({
			journey_id: journeyId,
			screen_id: e.screen,
			outcome: e.outcome ?? null,
			duration_s: e.duration,
			device: batch.device
		}))
	);
	if (error) return false;
	const minute = new Date(Math.floor(now().getTime() / 60_000) * 60_000).toISOString();
	const { error: updateError } = await admin
		.from('survey_journeys')
		.update({ last_event_at: minute })
		.eq('id', journeyId);
	if (updateError) return false;
	if (batch.events.some((e) => e.screen === 'end')) {
		const { error: doneError } = await admin
			.from('survey_journeys')
			.update({ completed_at: minute })
			.eq('id', journeyId)
			.is('completed_at', null);
		if (doneError) return false;
	}
	return true;
}
