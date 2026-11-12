/**
 * Prints the rulebook for the reviewers (Mauro and Chiara) as Markdown, from the rule objects
 * and the Italian copy. Run with: node scripts/rulebook.ts > rulebook.md
 */
import { mapCopy } from '../src/lib/content/map.it.ts';
import { RULES, RULES_VERSION } from '../src/lib/map/rules.ts';

const TIERS: Record<string, string> = {
	'1': 'spese e rate sopra le entrate',
	'2': 'persone e protezione',
	'3': 'obiettivi contro abitudini, tempi o risorse',
	'4': 'cose non note che la persona possiede',
	'5': 'altre letture',
	'6': 'punto fermo, mai in evidenza',
	F: 'fatto calcolato, mai in evidenza'
};

const lines: string[] = [
	'# Libro delle regole della mappa',
	'',
	`Versione regole: ${RULES_VERSION}. ${RULES.length} regole.`,
	'',
	'Ogni testo qui sotto è un modello approvabile: le parti tra graffe vengono riempite dai valori calcolati.',
	"Se una regola ha più varianti, vale la prima la cui condizione è vera (l'ordine è quello della lista).",
	'La riga "Da non far intendere" serve a chi rivede e non viene mai stampata.',
	''
];

for (const rule of RULES) {
	const copy = mapCopy.rules[rule.id];
	lines.push(
		`## ${rule.id} (${mapCopy.areaTitles[rule.area]})`,
		'',
		`- Area: ${rule.area}`,
		`- Prospettiva: ${rule.lens}`,
		`- Livello: ${rule.tier} (${TIERS[String(rule.tier)]})`,
		`- Legge: ${rule.reads.join(', ')}`,
		...(rule.unless ? [`- Non stampata quando scatta: ${rule.unless}`] : []),
		`- Approvata: ${rule.approved ? 'sì' : 'no'}`,
		'',
		...(typeof copy.text === 'string'
			? [`Testo: ${copy.text}`, '']
			: Object.entries(copy.text).flatMap(([variant, text]) => [
					`Variante \`${variant}\`: ${text}`,
					''
				])),
		`Domanda da portare: ${copy.question ?? '(nessuna)'}`,
		'',
		`Da non far intendere: ${copy.never ?? '(nessuna nota)'}`,
		''
	);
}

process.stdout.write(lines.join('\n'));
