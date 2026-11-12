import { describe, expect, it } from 'vitest';
import { mapCopy } from '../content/map.it.ts';
import { makeWording, upperFirst } from './wording.ts';

const w = makeWording(mapCopy.wording);
const i = (lo: number, hi: number) => ({ lo, hi });

describe('euros', () => {
	it('uses a dot for thousands', () => {
		expect(w.number(4800)).toBe('4.800');
		expect(w.number(125000)).toBe('125.000');
		expect(w.number(700)).toBe('700');
	});
	it('says between, up to or at least', () => {
		expect(w.eur(i(4800, 8400))).toBe('tra 4.800 e 8.400 euro');
		expect(w.eur(i(0, 800))).toBe('fino a 800 euro');
		expect(w.eur(i(-700, 400))).toBe('fino a 400 euro');
		expect(w.eur(i(3000, Infinity))).toBe('almeno 3.000 euro');
	});
	it('has a short form with the euro sign and no wording for an open, non-positive range', () => {
		expect(w.eurShort(i(4800, 6600))).toBe('tra 4.800 e 6.600 €');
		expect(w.eur(i(0, Infinity))).toBeNull();
		expect(w.eur(null)).toBeNull();
	});
});

describe('months', () => {
	it('says less than a month when the upper bound is below 1', () => {
		expect(w.months(i(0, 0))).toBe('meno di un mese');
		expect(w.months(i(0.1, 0.99))).toBe('meno di un mese');
	});
	it('does not round the upper bound before comparing', () => {
		expect(w.months(i(0, 1.25))).toBe('fino a circa 2 mesi');
		expect(w.months(i(0, 1))).toBe('fino a circa un mese');
	});
	it('rounds the lower bound down and the upper bound up', () => {
		expect(w.months(i(5.45, 15.6))).toBe('tra circa 5 e 16 mesi');
	});
	it('says more than a year from 12 months', () => {
		expect(w.months(i(12, 30))).toBe('più di un anno');
		expect(w.months(i(41.7, Infinity))).toBe('più di un anno');
	});
	it('says beyond N months for an open upper end', () => {
		expect(w.months(i(5.2, Infinity))).toBe('oltre 5 mesi');
	});
});

describe('weeks', () => {
	it('rounds outward', () => {
		expect(w.weeks(i(4.33, 5.78))).toBe('tra 4 e 6 settimane');
		expect(w.weeks(i(4, 4))).toBe('circa 4 settimane');
		expect(w.weeks(i(0, 1.7))).toBe('fino a 2 settimane');
		expect(w.weeks(i(8.6, Infinity))).toBe('almeno 8 settimane');
	});
});

describe('shares', () => {
	it('rounds outward to the nearest 5', () => {
		expect(w.share(i(21, 46.7))).toBe('tra il 20% e il 50%');
		expect(w.share(i(20, 35))).toBe('tra il 20% e il 35%');
		expect(w.share(i(60, 95))).toBe('tra il 60% e il 95%');
		expect(w.share(i(60, 100))).toBe('almeno il 60%');
	});
	it('says up to when the lower bound rounds to zero', () => {
		expect(w.share(i(2, 12))).toBe('fino al 15%');
		expect(w.share(i(0, 55))).toBe('fino al 55%');
	});
	it('says at least when the upper end is open or above 100', () => {
		expect(w.share(i(53.3, 120))).toBe('almeno il 50%');
		expect(w.share(i(20, Infinity))).toBe('almeno il 20%');
	});
	it('elides the article before 80 and 85', () => {
		expect(w.share(i(81, 90))).toBe("tra l'80% e il 90%");
		expect(w.share(i(40, 82))).toBe("tra il 40% e l'85%");
		expect(w.share(i(0, 78))).toBe("fino all'80%");
		expect(w.share(i(81, Infinity))).toBe("almeno l'80%");
	});
	it('has no wording from a lower bound of 100, nor when open at both ends', () => {
		expect(w.share(i(150, Infinity))).toBeNull();
		expect(w.share(i(0, Infinity))).toBeNull();
	});
});

describe('phrases and lists', () => {
	it('capitalises the first letter', () => {
		expect(upperFirst('la pensione')).toBe('La pensione');
	});
	it('joins with commas and a final e', () => {
		expect(w.list(['la casa'])).toBe('la casa');
		expect(w.list(['la casa', 'i risparmi'])).toBe('la casa e i risparmi');
		expect(w.list(['la casa', 'i risparmi', 'le coperture'])).toBe(
			'la casa, i risparmi e le coperture'
		);
	});
	it('fails closed on an unknown phrase', () => {
		expect(w.phrase('children', 3)).toBe('tre o più figli');
		expect(() => w.phrase('children', 9)).toThrow();
	});
});
