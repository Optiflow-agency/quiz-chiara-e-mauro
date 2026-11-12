import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { ESCAPES } from './catalogue';
import { parseCondition } from './conditions';

const sheets = catalogue.sheets;
const fields = sheets.flatMap((sheet) => sheet.fields.map((field) => ({ sheet, field })));

describe('sheet catalogue', () => {
	it('has the 18 schede in order, the gate right after S03', () => {
		const ids = Array.from({ length: 18 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`);
		expect(sheets.map((sheet) => sheet.id)).toEqual(ids);
	});

	it('has unique field ids within each sheet', () => {
		for (const sheet of sheets) {
			const ids = sheet.fields.map((f) => f.id);
			expect(new Set(ids).size, sheet.id).toBe(ids.length);
		}
	});

	it('gives every choice field options with unique values that do not clash with the escapes', () => {
		for (const { sheet, field } of fields) {
			if (field.type !== 'single' && field.type !== 'multi') continue;
			const values = field.options.map((o) => o.value);
			expect(values.length, `${sheet.id}.${field.id}`).toBeGreaterThan(0);
			expect(new Set(values).size, `${sheet.id}.${field.id}`).toBe(values.length);
			expect(values).not.toContain('unknown');
			expect(values).not.toContain('withheld');
		}
	});

	it('lets every choice field be declined, since no question can be skipped', () => {
		const choices = fields.filter(({ field }) => field.type === 'single' || field.type === 'multi');
		for (const { sheet, field } of choices) {
			const escapes = 'escapes' in field ? (field.escapes ?? []) : [];
			expect(escapes, `${sheet.id}.${field.id}`).toContain('withheld');
		}
	});

	it('uses max_choices and exclusive only on multi fields', () => {
		for (const { sheet, field } of fields) {
			const where = `${sheet.id}.${field.id}`;
			if (field.type === 'single' || field.type === 'multi') {
				if (field.type === 'single') {
					expect(field.max_choices, where).toBeUndefined();
					expect(
						field.options.some((o) => o.exclusive),
						where
					).toBe(false);
				}
			}
		}
	});

	it('references only defined band sets, each with ordered, contiguous bands', () => {
		for (const { sheet, field } of fields)
			if (field.type === 'band')
				expect(catalogue.amountBandSets, `${sheet.id}.${field.id}`).toHaveProperty(field.band_set);
		for (const [name, bands] of Object.entries(catalogue.amountBandSets)) {
			expect(new Set(bands.map((b) => b.value)).size, name).toBe(bands.length);
			bands.forEach((band, i) => {
				expect(band.hi === null || band.hi >= band.lo, name).toBe(true);
				if (i > 0) expect(band.lo, name).toBeGreaterThanOrEqual(bands[i - 1].lo);
				if (band.hi === null) expect(i, name).toBe(bands.length - 1);
			});
		}
	});

	it('has display_when rules that parse and point at existing sheets, fields and options', () => {
		const rules = [
			...sheets.map((sheet) => ({ where: sheet.id, rule: sheet.display_when })),
			...fields.map(({ sheet, field }) => ({
				where: `${sheet.id}.${field.id}`,
				rule: field.display_when
			})),
			...fields.flatMap(({ sheet, field }) =>
				'options' in field
					? field.options.flatMap((o) =>
							o.display_when
								? [{ where: `${sheet.id}.${field.id}.${o.value}`, rule: o.display_when }]
								: []
						)
					: []
			)
		];
		for (const { where, rule } of rules) {
			const parsed = parseCondition(rule);
			if (parsed.kind !== 'any') continue; // `always`
			for (const alt of parsed.of)
				for (const test of alt.kind === 'all' ? alt.of : []) {
					if (test.kind !== 'test') throw new Error(`${where}: ${rule}`);
					const target = sheets
						.find((s) => s.id === test.sheet)
						?.fields.find((f) => f.id === test.field);
					expect(target, `${where}: ${rule}`).toBeDefined();
					if (target?.type === 'textarea' || !target)
						throw new Error(`${where}: ${rule} tests a field without options`);
					const values =
						target.type === 'band'
							? [...catalogue.amountBandSets[target.band_set].map((b) => b.value), ...ESCAPES]
							: [...target.options.map((o) => o.value), ...(target.escapes ?? [])];
					for (const operand of test.operand)
						expect(values, `${where}: ${rule}`).toContain(operand);
				}
		}
	});
});
