export interface SectionContent {
	title: string;
	/** Part of the title rendered as the italic accent word. */
	accent?: string;
	intro?: string;
	/** A short reassurance line under the intro, in the same column. */
	note?: string;
	/** How long it takes, shown beside the call to action. */
	duration?: string;
	cta?: string;
}
