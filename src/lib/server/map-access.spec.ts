import { describe, expect, it } from 'vitest';
import { isDraftSwitchOn } from './map-access';

describe('isDraftSwitchOn', () => {
	it('is on only for "1"', () => {
		expect(isDraftSwitchOn('1')).toBe(true);
		for (const raw of [undefined, '', '0', 'true', 'yes']) expect(isDraftSwitchOn(raw)).toBe(false);
	});
});
