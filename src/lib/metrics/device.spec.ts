import { describe, expect, it } from 'vitest';
import { deviceClass } from './device';

describe('deviceClass', () => {
	it('labels touch devices by their short side', () => {
		expect(deviceClass({ coarsePointer: true, width: 390, height: 844 })).toBe('smartphone');
		expect(deviceClass({ coarsePointer: true, width: 844, height: 390 })).toBe('smartphone');
		expect(deviceClass({ coarsePointer: true, width: 820, height: 1180 })).toBe('tablet');
	});
	it('labels fine pointers as computer, whatever the window size', () => {
		expect(deviceClass({ coarsePointer: false, width: 400, height: 700 })).toBe('computer');
		expect(deviceClass({ coarsePointer: false, width: 1440, height: 900 })).toBe('computer');
	});
});
