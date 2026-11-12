import { describe, expect, it } from 'vitest';
import { POLICY_VERSION, recordConsent } from './consent';

describe('recordConsent', () => {
	const fake = () => {
		const inserted: unknown[] = [];
		const supabase = {
			from: () => ({
				insert: async (r: unknown) => (inserted.push(r), { error: null })
			})
		};
		return { supabase: supabase as never, inserted };
	};

	it('appends the processing consent as granted by default', async () => {
		const { supabase, inserted } = fake();
		expect(await recordConsent(supabase, 'u1')).toBe(true);
		expect(inserted).toEqual([
			{ user_id: 'u1', purpose: 'processing', granted: true, policy_version: POLICY_VERSION }
		]);
	});

	it('appends a withdrawal', async () => {
		const { supabase, inserted } = fake();
		expect(await recordConsent(supabase, 'u1', false)).toBe(true);
		expect(inserted).toMatchObject([{ purpose: 'processing', granted: false }]);
	});
});
