import type { SupabaseClient } from '@supabase/supabase-js';
import { messages as m } from '$lib/content/messages.it';
import type { Catalogue, CatalogueField } from '$lib/survey/catalogue';
import { GATE_AFTER } from '$lib/survey/screens';
import { DEVICES, OUTCOMES, type Device, type Outcome } from '$lib/metrics/events';

/**
 * Survey statistics for the admin page. Loading takes the admin client; everything else is pure
 * over plain rows (with an injected `now`), so it is unit-tested without a database. Views come
 * out as formatted tables, shared by the page and the CSV download.
 */

const DAY_MS = 86_400_000;
export const PAUSE_MS = 30 * 60_000;
export const ABANDON_MS = 7 * DAY_MS;
/** Counts below this are shown as "< 5", and so are statistics computed from fewer values. */
export const MIN_CELL = 5;
const MAX_RANGE_DAYS = 366;
const PAGE = 1000;
const MAX_PAGES = 500;

export interface CounterRow {
	day: string;
	catalogue_version: string;
	screen_id: string;
	device: Device;
	n: number;
}
export interface JourneyRow {
	id: string;
	catalogue_version: string;
	start_device: Device;
	started_at: string;
	last_event_at: string;
	completed_at: string | null;
}
export interface EventRow {
	journey_id: string;
	screen_id: string;
	outcome: Outcome | null;
	duration_s: number | null;
	device: Device;
	at: string;
}
export interface RawStats {
	counters: CounterRow[];
	journeys: JourneyRow[];
	events: EventRow[];
}

/** A formatted table. `bars` (0 to 1, one per row) is optional and drawn by the page only. */
export interface Table {
	columns: readonly string[];
	rows: string[][];
	bars?: number[];
}

export const VIEWS = [
	'riepilogo',
	'imbuto',
	'tempi',
	'risposte',
	'dispositivi',
	'riprese'
] as const;
export type View = (typeof VIEWS)[number];

// ---- Filters ----

export interface Filters {
	/** Inclusive, YYYY-MM-DD. */
	from: string;
	to: string;
	device: Device | 'all';
	/** A catalogue version, or 'all'. */
	version: string;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const versionPattern = /^[A-Za-z0-9_.:-]{1,64}$/;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function parseDay(raw: string | null): number | null {
	if (!raw || !datePattern.test(raw)) return null;
	const ms = Date.parse(`${raw}T00:00:00Z`);
	return Number.isNaN(ms) || isoDay(ms) !== raw ? null : ms;
}

/** Validated, bounded filters from a query string. Defaults: last 30 days, all devices, current version. */
export function parseFilters(params: URLSearchParams, now: Date, currentVersion: string): Filters {
	const today = Date.parse(`${isoDay(now.getTime())}T00:00:00Z`);
	let to = parseDay(params.get('al')) ?? today;
	let from = parseDay(params.get('dal')) ?? to - 29 * DAY_MS;
	if (from > to) [from, to] = [to, from];
	from = Math.max(from, to - (MAX_RANGE_DAYS - 1) * DAY_MS);
	const device = params.get('dispositivo');
	const version = params.get('versione');
	return {
		from: isoDay(from),
		to: isoDay(to),
		device: DEVICES.find((d) => d === device) ?? 'all',
		version:
			version === 'all' ? 'all' : version && versionPattern.test(version) ? version : currentVersion
	};
}

// ---- Loading ----

interface Page<T> {
	data: T[] | null;
	error: unknown;
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
	const rows: T[] = [];
	for (let i = 0; i < MAX_PAGES; i++) {
		const { data, error } = await page(i * PAGE, (i + 1) * PAGE - 1);
		if (error) throw error;
		rows.push(...(data ?? []));
		if (!data || data.length < PAGE) break;
	}
	return rows;
}

/** The rows the filters select, paged past the 1000-row limit of a single select. */
export async function loadStats(admin: SupabaseClient, f: Filters): Promise<RawStats> {
	const since = `${f.from}T00:00:00Z`;
	const until = `${isoDay(Date.parse(`${f.to}T00:00:00Z`) + DAY_MS)}T00:00:00Z`;

	const counters = await fetchAll<CounterRow>((a, b) => {
		let q = admin
			.from('survey_screen_counts')
			.select('day, catalogue_version, screen_id, device, n')
			.gte('day', f.from)
			.lte('day', f.to);
		if (f.version !== 'all') q = q.eq('catalogue_version', f.version);
		if (f.device !== 'all') q = q.eq('device', f.device);
		return q.order('day').order('screen_id').order('device').order('catalogue_version').range(a, b);
	});

	const journeys = await fetchAll<JourneyRow>((a, b) => {
		let q = admin
			.from('survey_journeys')
			.select('id, catalogue_version, start_device, started_at, last_event_at, completed_at')
			.gte('started_at', since)
			.lt('started_at', until);
		if (f.version !== 'all') q = q.eq('catalogue_version', f.version);
		if (f.device !== 'all') q = q.eq('start_device', f.device);
		return q.order('id').range(a, b);
	});

	const events = await fetchAll<EventRow>((a, b) => {
		let q = admin
			.from('survey_journey_events')
			.select(
				'id, journey_id, screen_id, outcome, duration_s, device, at, survey_journeys!inner(id)'
			)
			.gte('survey_journeys.started_at', since)
			.lt('survey_journeys.started_at', until);
		if (f.version !== 'all') q = q.eq('survey_journeys.catalogue_version', f.version);
		if (f.device !== 'all') q = q.eq('survey_journeys.start_device', f.device);
		return q.order('id').range(a, b);
	});

	return { counters, journeys, events };
}

/** The catalogue versions that have visit counters, for the filter list. */
export async function loadVersions(admin: SupabaseClient): Promise<string[]> {
	const rows = await fetchAll<{ catalogue_version: string }>((a, b) =>
		admin
			.from('survey_screen_counts')
			.select('catalogue_version')
			.eq('screen_id', 'visit')
			.order('catalogue_version')
			.range(a, b)
	);
	return [...new Set(rows.map((r) => r.catalogue_version))];
}

// ---- Small pure helpers ----

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

export function mean(values: number[]): number | null {
	return values.length === 0 ? null : sum(values) / values.length;
}

export function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const number = new Intl.NumberFormat('it-IT');
const SMALL = '< 5';
const NONE = '—';
const isSmall = (n: number) => n >= 1 && n < MIN_CELL;

/** A count, with 1 to 4 hidden. */
export const count = (n: number): string => (isSmall(n) ? SMALL : number.format(n));

/** A share of `den`, hidden when the numerator is a small count. */
export function pct(num: number, den: number): string {
	if (den === 0) return NONE;
	if (isSmall(num)) return SMALL;
	return `${((num / den) * 100).toFixed(1).replace('.', ',')} %`;
}

/** m:ss */
export function formatDuration(seconds: number): string {
	const s = Math.round(seconds);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** A statistic over `values`, hidden when there are fewer than MIN_CELL of them. */
function stat(values: number[], pick: (v: number[]) => number | null, fmt: (n: number) => string) {
	if (values.length === 0) return NONE;
	if (values.length < MIN_CELL) return SMALL;
	const v = pick(values);
	return v === null ? NONE : fmt(v);
}

const hours = (ms: number) => `${(ms / 3_600_000).toFixed(1).replace('.', ',')} h`;

const sumScreen = (counters: CounterRow[], screen: string) =>
	sum(counters.filter((c) => c.screen_id === screen).map((c) => c.n));

const time = (iso: string) => Date.parse(iso);

/** Completed, or inactive for at least 7 days. */
const isAbandoned = (j: JourneyRow, now: Date) =>
	!j.completed_at && now.getTime() - time(j.last_event_at) >= ABANDON_MS;
const isTerminal = (j: JourneyRow, now: Date) => !!j.completed_at || isAbandoned(j, now);

function byJourney(events: EventRow[]): Map<string, EventRow[]> {
	const map = new Map<string, EventRow[]>();
	for (const e of events) {
		const list = map.get(e.journey_id);
		if (list) list.push(e);
		else map.set(e.journey_id, [e]);
	}
	// Stable: events of the same minute keep their arrival order.
	for (const list of map.values()) list.sort((a, b) => time(a.at) - time(b.at));
	return map;
}

// ---- Questions ----

export interface QuestionRef {
	id: string;
	label: string;
	/** Missing for the consent gate. */
	field?: CatalogueField;
}

/** Question screens in catalogue order, the gate in its position. */
export function questionsOf(catalogue: Catalogue): QuestionRef[] {
	const out: QuestionRef[] = [];
	for (const sheet of catalogue.sheets) {
		for (const field of sheet.fields) {
			out.push({ id: `${sheet.id}.${field.id}`, label: `${sheet.id} · ${field.label}`, field });
		}
		if (sheet.id === GATE_AFTER) out.push({ id: 'gate', label: m.stats.rows.gateLabel });
	}
	return out;
}

/** Whether a question offers the escape ("Non lo so" / "Preferisco non dirlo"). */
function offers(field: CatalogueField, escape: 'unknown' | 'withheld'): boolean {
	if (field.type === 'band') return true;
	if (field.type === 'textarea') return false;
	return field.escapes?.includes(escape) ?? false;
}

// ---- Views ----

const v = m.stats.views;
const r = m.stats.rows;

export function summaryTable(counters: CounterRow[], journeys: JourneyRow[], now: Date): Table {
	const visits = sumScreen(counters, 'visit');
	const started = sumScreen(counters, 'start');
	const gate = sumScreen(counters, 'gate');
	const completed = journeys.filter((j) => j.completed_at).length;
	const inProgress = journeys.filter((j) => !j.completed_at && !isAbandoned(j, now)).length;
	const abandoned = journeys.filter((j) => isAbandoned(j, now)).length;
	const lost = Math.max(0, started - completed - inProgress);
	return {
		columns: v.riepilogo.columns,
		rows: [
			[r.visits, count(visits)],
			[r.started, count(started)],
			[r.gate, count(gate)],
			[r.journeys, count(journeys.length)],
			[r.completed, count(completed)],
			[r.inProgress, count(inProgress)],
			[r.abandoned, count(abandoned)],
			[r.completionRate, pct(completed, started)],
			[r.abandonRate, pct(lost, started)]
		]
	};
}

export function funnelTable(counters: CounterRow[], questions: QuestionRef[]): Table {
	const reached = questions.map((q) => sumScreen(counters, q.id));
	const top = Math.max(0, ...reached);
	const rows = questions.map((q, i) => {
		const prev = reached[i - 1];
		let drop = NONE;
		if (i > 0 && prev > 0) {
			drop =
				isSmall(reached[i]) || isSmall(prev)
					? SMALL
					: `${(((prev - reached[i]) / prev) * 100).toFixed(1).replace('.', ',')} %`;
		}
		return [q.label, count(reached[i]), drop];
	});
	return {
		columns: v.imbuto.columns,
		rows,
		bars: reached.map((n) => (n >= MIN_CELL && top > 0 ? n / top : 0))
	};
}

export function timesTable(
	events: EventRow[],
	journeys: JourneyRow[],
	questions: QuestionRef[]
): Table {
	const durations = (screen: string) =>
		events
			.filter((e) => e.screen_id === screen && e.duration_s !== null)
			.map((e) => e.duration_s as number);
	const line = (label: string, values: number[]) => [
		label,
		count(values.length),
		stat(values, mean, formatDuration),
		stat(values, median, formatDuration)
	];
	const rows = questions.filter((q) => q.field).map((q) => line(q.label, durations(q.id)));

	const completed = new Set(journeys.filter((j) => j.completed_at).map((j) => j.id));
	const totals = [...byJourney(events.filter((e) => completed.has(e.journey_id)))].map(([, list]) =>
		sum(list.map((e) => e.duration_s ?? 0))
	);
	rows.push(line(r.totalTime, totals));
	return { columns: v.tempi.columns, rows };
}

export function responsesTable(
	events: EventRow[],
	journeys: JourneyRow[],
	questions: QuestionRef[],
	now: Date
): Table {
	const terminal = new Set(journeys.filter((j) => isTerminal(j, now)).map((j) => j.id));
	// Per question, the last outcome of every terminal journey.
	const last = new Map<string, Map<string, Outcome>>();
	for (const [id, list] of byJourney(events.filter((e) => terminal.has(e.journey_id)))) {
		for (const e of list) {
			if (!e.outcome) continue;
			let perJourney = last.get(e.screen_id);
			if (!perJourney) last.set(e.screen_id, (perJourney = new Map()));
			perJourney.set(id, e.outcome);
		}
	}
	const cell = (n: number, total: number) =>
		isSmall(n) ? SMALL : `${count(n)} (${pct(n, total)})`;
	const rows = questions
		.filter((q) => q.field)
		.map((q) => {
			const outcomes = [...(last.get(q.id)?.values() ?? [])];
			const total = outcomes.length;
			const tally = (o: Outcome) => outcomes.filter((x) => x === o).length;
			const column = (o: Outcome) =>
				(o === 'unknown' || o === 'withheld') && !offers(q.field as CatalogueField, o)
					? NONE
					: cell(tally(o), total);
			return [q.label, count(total), ...OUTCOMES.map(column)];
		});
	return { columns: v.risposte.columns, rows };
}

export function devicesTable(counters: CounterRow[], journeys: JourneyRow[]): Table {
	const visits = (d: Device) =>
		sum(counters.filter((c) => c.screen_id === 'visit' && c.device === d).map((c) => c.n));
	const starts = (d: Device) => journeys.filter((j) => j.start_device === d).length;
	const totalVisits = sum(DEVICES.map(visits));
	return {
		columns: v.dispositivi.columns,
		rows: DEVICES.map((d) => [
			m.stats.devices[d],
			count(visits(d)),
			pct(visits(d), totalVisits),
			count(starts(d)),
			pct(starts(d), journeys.length)
		])
	};
}

export function pausesTable(events: EventRow[], journeys: JourneyRow[]): Table {
	const lengths: number[] = [];
	let resumed = 0;
	let otherDevice = 0;
	for (const list of byJourney(events).values()) {
		let paused = false;
		for (let i = 1; i < list.length; i++) {
			const gap = time(list[i].at) - time(list[i - 1].at);
			if (gap < PAUSE_MS) continue;
			paused = true;
			lengths.push(gap);
			if (list[i].device !== list[i - 1].device) otherDevice++;
		}
		if (paused) resumed++;
	}
	return {
		columns: v.riprese.columns,
		rows: [
			[r.resumed, count(resumed)],
			[r.resumedShare, pct(resumed, journeys.length)],
			[r.pauseMean, stat(lengths, mean, hours)],
			[r.pauseMedian, stat(lengths, median, hours)],
			[r.otherDevice, count(otherDevice)]
		]
	};
}

/** Every view for the rows loaded under one set of filters. */
export function buildViews(raw: RawStats, catalogue: Catalogue, now: Date): Record<View, Table> {
	const questions = questionsOf(catalogue);
	return {
		riepilogo: summaryTable(raw.counters, raw.journeys, now),
		imbuto: funnelTable(raw.counters, questions),
		tempi: timesTable(raw.events, raw.journeys, questions),
		risposte: responsesTable(raw.events, raw.journeys, questions, now),
		dispositivi: devicesTable(raw.counters, raw.journeys),
		riprese: pausesTable(raw.events, raw.journeys)
	};
}

// ---- CSV ----

const csvField = (value: string) =>
	/[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/** Semicolon-separated with a BOM, which Italian Excel opens correctly. */
export function toCsv(table: Table): string {
	const lines = [table.columns, ...table.rows].map((row) => row.map(csvField).join(';'));
	return `\uFEFF${lines.join('\r\n')}\r\n`;
}
