/** A4 portrait in points, with the content box shared by all four pages. */
export const PAGE = {
	width: 595.28,
	height: 841.89,
	marginX: 44,
	/** Lowest y that page content may reach; the footer starts below it. */
	bottom: 782,
	footerY: 794
};
export const CONTENT_WIDTH = PAGE.width - 2 * PAGE.marginX;

/** Top of every page: the survey's top bar and, on page 1, the navy masthead behind it. */
export const HEAD = {
	barY: 24,
	/** Progress line under the bar. */
	lineY: 42,
	titleY: 54,
	/** Height of the full-bleed navy ground of page 1. */
	masthead: 124,
	/** Where the content of pages 2 to 4 starts. */
	bodyY: 91
};

/** The survey's tokens (`src/routes/layout.css`); ink, muted and hairline are darker for print. */
export const COLOR = {
	ink: '#141a26',
	navy: '#0b2545',
	navyDeep: '#071a33',
	navyGlow: '#12386b',
	blue: '#1e6fe8',
	blueDark: '#1558b8',
	blueOnDark: '#6fa3ff',
	ice: '#eaf1fb',
	/** Off-white paper of every page, and two deeper ice tints for the map's layered ground. */
	paper: '#f7f9fc',
	iceDeep: '#d9e6f8',
	iceDeeper: '#c4d7f2',
	muted: '#4b5b70',
	mutedOnDark: '#a7bbd6',
	textOnDark: '#dce6f5',
	hairline: '#9fb0c6',
	/** The survey's progress track on navy: white at 14%. */
	trackOnDark: '#2d445f',
	white: '#ffffff'
};

/** Body text starts at 10.5pt and may shrink to 9pt (see `LADDER`); tags and footer are 9pt. */
export const SIZE = {
	display: 28,
	title: 22,
	heading: 12.5,
	body: 10.5,
	small: 10,
	wordmark: 10.5,
	tag: 9,
	footer: 9,
	/** Upper-case section labels, tracked. */
	eyebrow: 7.5,
	/** The page-1 numbers, in Montserrat Light. */
	figure: 17
};

/**
 * Six columns of the content width: the map and the highlights take four, the numbers and the
 * note for the reader two.
 */
export const GRID = { gutter: 12, wide: 334, narrow: 161 };

/**
 * How much a page gives up to stay on one sheet. Levels are tried in order and the first one
 * whose content fits wins. Approved sentences (area paragraphs, highlights, the numbers, the
 * context line) are always printed whole. Allowed: tighter spacing, a smaller body size (down to
 * 9pt) and, on page 1 only, a cut of the person's own free-text question.
 */
export interface Fit {
	tight: boolean;
	/** Body text size in points. */
	body: number;
	/** Lines of the respondent's own question on page 1; beyond them it ends in an ellipsis. */
	questionLines: number;
}

const fit = (tight: boolean, body: number, questionLines = Infinity): Fit => ({
	tight,
	body,
	questionLines
});

export const LADDER: Fit[] = [
	fit(false, 10.5),
	fit(true, 10.5),
	fit(true, 10),
	fit(true, 9.5),
	fit(true, 9),
	fit(true, 9, 6),
	fit(true, 9, 4),
	fit(true, 9, 3),
	fit(true, 9, 2),
	fit(true, 9, 1)
];

/**
 * Pages 2 and 3 first try larger body sizes, from 12pt down, with the normal spacing, so the
 * area paragraphs read comfortably; then the same steps as `LADDER`.
 */
export const AREA_LADDER: Fit[] = [
	fit(false, 12),
	fit(false, 11.5),
	fit(false, 11),
	fit(false, 10.5),
	...LADDER.slice(1)
];
