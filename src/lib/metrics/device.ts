import type { Device } from './events';

/** The browser inputs the class is derived from, injected so it can be tested. */
export interface DeviceEnv {
	/** `matchMedia('(pointer: coarse)').matches`: touch is the primary input. */
	coarsePointer: boolean;
	width: number;
	height: number;
}

const PHONE_MAX_SHORT_SIDE = 600;

/** A coarse label only; nothing else about the device leaves the browser. */
export function deviceClass({ coarsePointer, width, height }: DeviceEnv): Device {
	if (!coarsePointer) return 'computer';
	return Math.min(width, height) < PHONE_MAX_SHORT_SIDE ? 'smartphone' : 'tablet';
}

export function browserDeviceEnv(win: Window): DeviceEnv {
	return {
		coarsePointer: win.matchMedia('(pointer: coarse)').matches,
		width: win.innerWidth,
		height: win.innerHeight
	};
}
