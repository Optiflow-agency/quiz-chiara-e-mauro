import type { Catalogue } from '$lib/survey/catalogue';
// The import attribute lets plain Node (scripts, type stripping) load the JSON as well as Vite.
import data from './sheets.it.json' with { type: 'json' };

/** Italian sheet catalogue (questionnaire and map rules approved by the consultants). */
export const catalogue: Catalogue = data as Catalogue;

/** Stored with every saved response, so answers can be read against the catalogue they came from. */
export const CATALOGUE_VERSION = '2026-11-10';
