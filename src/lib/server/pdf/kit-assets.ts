import { read } from '$app/server';
import body from './fonts/Lato-Regular.ttf';
import bold from './fonts/Lato-Bold.ttf';
import brandItalic from './fonts/Montserrat-Italic.ttf';
import heading from './fonts/Montserrat-SemiBold.ttf';
import display from './fonts/Montserrat-Light.ttf';
import headingItalic from './fonts/Montserrat-SemiBoldItalic.ttf';
import horizon from './images/horizon.jpg';
import masthead from './images/masthead.jpg';
import type { MapDeps } from './draw-map.ts';

const load = async (url: string) => new Uint8Array(await read(url).arrayBuffer());

/**
 * Reads the brand fonts through SvelteKit's `read`, which works once the server is bundled
 * (Vercel). `loadFonts()` in `assets.ts` reads from disk and is for scripts and tests only.
 */
export async function readFonts(): Promise<MapDeps['fonts']> {
	const [h, hi, bi, b, bd, dp] = await Promise.all(
		[heading, headingItalic, brandItalic, body, bold, display].map(load)
	);
	return { heading: h, headingItalic: hi, brandItalic: bi, body: b, bold: bd, display: dp };
}

/** The page images, read the same way as the fonts. */
export async function readImages(): Promise<MapDeps['images']> {
	const [m, h] = await Promise.all([masthead, horizon].map(load));
	return { masthead: m, horizon: h };
}
