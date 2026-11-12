import { describe, expect, it } from 'vitest';
import { logAccess } from './access-log';

describe('logAccess', () => {
	it('inserts one user-actor entry and nothing else', async () => {
		let row: unknown;
		const admin = {
			from: (table: string) => ({
				insert: async (r: unknown) => ((row = { table, r }), { error: null })
			})
		};
		expect(await logAccess(admin as never, 'u1', 'export_data')).toBe(true);
		expect(row).toEqual({
			table: 'access_logs',
			r: { user_id: 'u1', actor: 'user', action: 'export_data' }
		});
	});

	it('reports a failed write', async () => {
		const admin = { from: () => ({ insert: async () => ({ error: { message: 'x' } }) }) };
		expect(await logAccess(admin as never, 'u1', 'logout')).toBe(false);
	});
});
