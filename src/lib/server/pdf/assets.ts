import { readFileSync } from 'node:fs';
import type { MapDeps } from './draw-map.ts';

const read = (path: string) => new Uint8Array(readFileSync(new URL(path, import.meta.url)));

/** Reads the embedded brand fonts from disk. Node-only convenience for scripts and tests. */
export function loadFonts(): MapDeps['fonts'] {
	return {
		heading: read('./fonts/Montserrat-SemiBold.ttf'),
		headingItalic: read('./fonts/Montserrat-SemiBoldItalic.ttf'),
		brandItalic: read('./fonts/Montserrat-Italic.ttf'),
		body: read('./fonts/Lato-Regular.ttf'),
		bold: read('./fonts/Lato-Bold.ttf'),
		display: read('./fonts/Montserrat-Light.ttf')
	};
}

/** Reads the page images from disk. Node-only convenience for scripts and tests. */
export function loadImages(): MapDeps['images'] {
	return { masthead: read('./images/masthead.jpg'), horizon: read('./images/horizon.jpg') };
}
