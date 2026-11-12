/** `MAP_DRAFT=1` renders the map as a draft (BOZZA mark, unapproved rules shown). Anything else is off. */
export const isDraftSwitchOn = (raw: string | undefined): boolean => raw === '1';
