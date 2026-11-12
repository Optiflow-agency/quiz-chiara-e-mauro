import type { Interval, Wording } from './types.ts';

/** Templates and phrase tables of the Italian wording (spec section 4); see `$lib/content/map.it`. */
export interface WordingCopy {
	unit: { long: string; short: string };
	euros: { between: string; up_to: string; at_least: string };
	months: {
		under_one: string;
		one: string;
		over_year: string;
		up_to: string;
		beyond: string;
		between: string;
	};
	weeks: { between: string; about: string; up_to: string; at_least: string };
	share: { between: string; up_to: string; at_least: string };
	/** Fixed phrases by group and key (people, counts, enumerations). */
	phrases: Record<string, Record<string, string>>;
	/** Final "e" of a list. */
	and: string;
	/** Language fix-ups a template cannot express, applied to each filled text (elision). */
	polish: (text: string) => string;
}

export const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const EPSILON = 1e-9;
const floorTo = (x: number, step: number) => Math.floor(x / step + EPSILON) * step;
const ceilTo = (x: number, step: number) => Math.ceil(x / step - EPSILON) * step;

function thousands(n: number): string {
	return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function fillTemplate(template: string, values: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
}

/** Builds the wording helpers from the copy; pure, so rules and tests can inject fakes. */
export function makeWording(copy: WordingCopy): Wording {
	const put = (template: string, values: Record<string, string | number>) =>
		copy.polish(fillTemplate(template, values));

	function euros(i: Interval | null, unit: string): string | null {
		if (!i) return null;
		const { lo, hi } = i;
		const values = { lo: thousands(lo), hi: thousands(hi), unit };
		if (hi === Infinity) return lo > 0 ? put(copy.euros.at_least, values) : null;
		return lo > 0 ? put(copy.euros.between, values) : put(copy.euros.up_to, values);
	}

	return {
		eur: (i) => euros(i, copy.unit.long),
		eurShort: (i) => euros(i, copy.unit.short),

		// Lower bound rounded down, upper bound rounded up, to whole months.
		months(i) {
			if (!i) return null;
			if (i.hi < 1) return copy.months.under_one;
			const lo = floorTo(i.lo, 1);
			if (lo >= 12) return copy.months.over_year;
			if (i.hi === Infinity) return put(copy.months.beyond, { lo });
			const hi = ceilTo(i.hi, 1);
			if (lo === 0) return hi === 1 ? copy.months.one : put(copy.months.up_to, { hi });
			return put(copy.months.between, { lo, hi });
		},

		// Rounded outward to whole weeks.
		weeks(i) {
			if (!i) return null;
			const lo = floorTo(i.lo, 1);
			if (i.hi === Infinity) return put(copy.weeks.at_least, { lo });
			const hi = ceilTo(i.hi, 1);
			if (lo === 0) return put(copy.weeks.up_to, { hi });
			return lo === hi ? put(copy.weeks.about, { n: lo }) : put(copy.weeks.between, { lo, hi });
		},

		// Bounds rounded outward to the nearest 5. A lower bound of 100 or more has no wording here:
		// the rules that can reach it carry their own alternative text.
		share(i) {
			if (!i) return null;
			const lo = floorTo(i.lo, 5);
			const hi = i.hi === Infinity ? Infinity : ceilTo(i.hi, 5);
			if (lo >= 100) return null;
			if (lo === 0) return hi > 100 ? null : put(copy.share.up_to, { hi });
			if (hi >= 100) return put(copy.share.at_least, { lo });
			return put(copy.share.between, { lo, hi });
		},

		number: thousands,

		phrase(group, key) {
			const phrase = copy.phrases[group]?.[String(key)];
			if (phrase === undefined) throw new Error(`No phrase "${group}" for "${key}"`);
			return phrase;
		},

		list(items) {
			if (items.length < 2) return items.join('');
			return `${items.slice(0, -1).join(', ')} ${copy.and} ${items.at(-1)}`;
		}
	};
}
