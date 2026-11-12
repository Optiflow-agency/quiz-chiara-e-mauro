import { describe, expect, it } from 'vitest';
import { catalogue } from '$lib/content/sheets.it';
import { reconcile } from './reconcile';

describe('reconcile', () => {
	it('returns only what actually changes', () => {
		const stored = { S01: { age_band: '26_35' } };
		expect(reconcile(catalogue, stored, { S01: { age_band: '26_35' } })).toEqual({});
		expect(reconcile(catalogue, stored, { S01: { age_band: '36_45' } })).toEqual({
			S01: { age_band: '36_45' }
		});
		expect(reconcile(catalogue, stored, { S01: null })).toEqual({ S01: null });
	});

	it('also deletes stored sheets the patch leaves hidden, even if the patch does not name them', () => {
		const stored = { S10: { investments: 'yes' }, S12: { chosen_by: 'self' } };
		const changes = reconcile(catalogue, stored, { S10: { investments: 'no' } });
		expect(changes).toEqual({ S10: { investments: 'no' }, S12: null });
	});

	it('drops a hidden sheet sent by a client that should not have sent it', () => {
		const changes = reconcile(
			catalogue,
			{},
			{ S10: { investments: 'no' }, S12: { chosen_by: 'self' } }
		);
		expect(changes).toEqual({ S10: { investments: 'no' } });
	});
});
