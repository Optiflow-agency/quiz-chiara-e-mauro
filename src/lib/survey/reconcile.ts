import { applyPatch, diffAnswers, type AnswerPatch, type Answers } from './answers';
import type { Catalogue } from './catalogue';
import { pruneHidden } from './prune';

/**
 * What must change in the stored answers for `patch` to apply: the patch itself plus whatever
 * it leaves hidden (e.g. a follow-up whose trigger it changes), which may sit in sheets the
 * patch does not mention. The server runs this so hidden answers are never kept, whatever the
 * sender knew about the other sheets.
 */
export function reconcile(catalogue: Catalogue, stored: Answers, patch: AnswerPatch): AnswerPatch {
	const merged = structuredClone(applyPatch(stored, patch));
	pruneHidden(catalogue, merged);
	return diffAnswers(stored, merged);
}
