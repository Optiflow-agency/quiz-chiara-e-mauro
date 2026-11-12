import type { MapCopy } from '../map/compose.ts';

/** Short names of the goals (survey Q36): shared by the rules and the page-1 goals line. */
const GOAL_NAMES = {
	buy_home: 'comprare casa',
	mortgage: 'il mutuo',
	capital: 'accumulare un capitale',
	grow_wealth: 'far crescere il patrimonio',
	extra_income: 'una rendita integrativa',
	retirement: 'la pensione',
	children: 'il futuro dei figli',
	protect: 'proteggere il patrimonio familiare',
	handover: 'il passaggio generazionale',
	freedom: 'la libertà finanziaria'
};

/**
 * All Italian copy of the map engine. Sentences, questions, "never imply" notes, area titles and
 * gather items are copied from `docs/map-spec.md` sections 4-8. Nothing here may read as advice:
 * a guard test checks every printable string.
 */
export const mapCopy: MapCopy = {
	rules: {
		// IO, Entrate e uscite
		'IO-01': {
			text: {
				surplus:
					'Pagate le spese fisse e le rate, ogni mese restano {margin_eur} per tutto il resto: spese libere, imprevisti e risparmio insieme.',
				shortfall: 'Spese fisse e rate superano le entrate: ogni mese mancano {gap_eur}.',
				even: 'Spese fisse e rate assorbono tutte le entrate: a fine mese non resta nulla, o mancano {gap_eur}.',
				close:
					'Entrate, spese fisse e rate sono vicine: con le fasce scelte, a fine mese possono restare fino a {margin_hi} euro oppure mancarne fino a {gap_hi}.'
			},
			never: 'a right or wrong level of spending'
		},
		'IO-02': {
			text: {
				untracked:
					'Ogni mese spese fisse e rate assorbono tutte le entrate, o le superano, e oggi entrate e uscite non vengono seguite con regolarità: da dove arrivi la differenza, la mappa non lo vede.',
				plain:
					'Ogni mese spese fisse e rate assorbono tutte le entrate, o le superano: la differenza viene coperta con risparmi, aiuti o credito, e con quale dei tre la mappa non lo vede.'
			},
			question: 'Da dove si può partire per rimettere in pari entrate e uscite?',
			never: 'that investments or products can recover the gap'
		},
		'IO-03': {
			text: {
				cannot:
					'Sulla carta, pagate spese fisse e rate, restano {margin_eur} al mese, eppure oggi non si riesce a mettere nulla da parte: in un anno sono {margin_year_eur} di cui la mappa non vede la destinazione.',
				no_quota:
					'Pagate spese fisse e rate, restano {margin_eur} al mese, e una quota da mettere da parte non è mai stata fissata: in un anno sono {margin_year_eur} senza una destinazione stabilita.'
			},
			question: 'Dove finisce quello che resta a fine mese?',
			never: 'how much should be saved'
		},
		'IO-04': {
			text: "In una famiglia di due adulti il tuo reddito è l'unica entrata: le spese fisse, {fixed_eur} al mese, poggiano tutte su di te.",
			question: 'Come si organizza la casa se la mia entrata cambia?',
			never: 'forecasts about work or income, or that the partner should work'
		},
		'IO-05': {
			text: 'Manca {missing_io}: senza, la mappa non può calcolare quanto resta a fine mese né quanto pesano rate e risparmio. È il numero da cui dipende quasi tutto il resto.',
			question: 'Come ricostruisco quanto entra e quanto esce davvero in un mese?',
			never: 'a judgement on the person'
		},
		'IO-06': {
			text: 'Entrate, spese e risparmio sono seguiti con regolarità: di quello che resta ogni mese si sa già dove va.'
		},
		'IO-07': {
			text: "I soldi dell'attività e quelli personali stanno, almeno in parte, sugli stessi conti: le cifre di entrate e spese fisse possono mescolare le due cose, e con loro quello che la mappa calcola a fine mese.",
			question: "Quanto di quello che entra e che esce riguarda la casa, e quanto l'attività?",
			never: 'that the accounts should be separated'
		},
		'IO-08': {
			text: 'Ogni mese si mettono da parte almeno {saving_lo} euro, più di quanto resta sulla carta dopo spese fisse e rate: una delle cifre di entrate, spese o risparmio non torna, e con lei i calcoli della mappa.',
			question: 'Quanto entra, quanto esce e quanto resta, davvero, in un mese?',
			never: 'that the person is wrong'
		},

		// RI, Riserva per gli imprevisti
		'RI-01': {
			text: 'I soldi disponibili subito coprono {cover_months} di spese fisse e rate.',
			never: 'that the reserve is enough or not enough'
		},
		'RI-02': {
			text: {
				plain: 'Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate.',
				above_reserve:
					"Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate, ed è più di tutto quello che c'è da parte.",
				share:
					'Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate, e {shock_share} di quello che è disponibile subito.'
			}
		},
		'RI-03': {
			text: {
				probably_no:
					'{dependent_children_phrase}, e per un imprevisto importante la liquidità probabilmente non basterebbe: ricadrebbe sulle spese di tutti i giorni.',
				sell_investments:
					'{dependent_children_phrase}, e per un imprevisto importante servirebbe usare o vendere gli investimenti: la liquidità da sola non basterebbe.'
			},
			question: 'Che cosa succede in casa se arriva una spesa importante e imprevista?',
			never: 'how many months would be right'
		},
		'RI-04': {
			text: {
				not_enough:
					"La liquidità copre almeno sei mesi di spese fisse e rate, eppure per un imprevisto importante non sembra bastare: o è già destinata ad altro, o l'imprevisto che si ha in mente è più grande. Quale dei due, la mappa non lo vede.",
				enough:
					'La liquidità è considerata sufficiente per un imprevisto importante; in spese fisse e rate vale {cover_months}.'
			},
			question: 'Per quale imprevisto basta, davvero, la liquidità che ho?',
			never: 'that the money should be used or moved'
		},
		'RI-05': {
			text: 'Per un imprevisto importante la liquidità probabilmente non basterebbe, e oggi non si mette da parte nulla con regolarità: un mese di spese fisse e rate vale {outgoings_eur}.',
			question: 'Su che cosa potrei contare per un imprevisto importante?',
			never: 'amounts or percentages to save'
		},
		'RI-06': {
			text: "Sul conto c'è più di un anno di spese fisse e rate, e i risparmi stanno soprattutto lì: oltre a quello che serve per gli imprevisti, il resto non ha ancora uno scopo preciso.",
			question: 'A cosa servono, e quando, i soldi che ho sul conto?',
			never: 'that they should be invested'
		},
		'RI-07': {
			text: {
				liquidity:
					'Non è nota la cifra disponibile subito: la mappa non può dire per quanto tempo reggerebbero spese fisse e rate.',
				fixed:
					'Da parte ci sono {liquidity_eur}; senza la cifra delle spese fisse non si possono tradurre in mesi.'
			},
			question: "Quanti soldi potrei usare davvero da un giorno all'altro?"
		},
		'RI-08': {
			text: {
				months:
					'{tax_phrase}: alle scadenze di saldo e acconti i soldi arrivano dalla stessa liquidità che serve per gli imprevisti, e quella davvero libera è meno di quanto appare.',
				plain:
					'{tax_phrase}: alle scadenze di saldo e acconti i soldi devono arrivare dalla liquidità o dalle entrate di quei mesi.'
			},
			question: 'Quanto pesano, e quando arrivano, le mie scadenze di tasse e contributi?',
			never: 'amounts or percentages to set aside, or how to organise the accounts'
		},

		// DE, Debiti e rate
		'DE-01': {
			text: {
				none: 'Nessuna rata in corso: tutte le entrate sono libere da impegni presi in passato.',
				all_income:
					"{debt_count_phrase} {instalments_year_eur} l'anno: tutte le entrate indicate, o più.",
				share:
					"{debt_count_phrase} {instalments_year_eur} l'anno: {instalment_share} di quello che entra.",
				amount: "{debt_count_phrase} {instalments_year_eur} l'anno."
			},
			never: 'a sustainability threshold'
		},
		'DE-06': {
			text: "Nello stesso periodo una parte dei soldi viene messa da parte e un'altra paga un prestito o un fido: sono due movimenti opposti, e quale dei due pesi di più dipende da costi che la mappa non ha.",
			question:
				'Come stanno insieme quello che metto da parte e quello che pago per prestiti e fidi?',
			never: 'paying off debts with savings'
		},
		'DE-07': {
			text: {
				sole: "Il mutuo poggia sul tuo reddito, l'unico della famiglia, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, la rata resta.",
				main: "Il mutuo poggia soprattutto sul tuo reddito, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, la rata resta."
			},
			question: 'Che cosa succede al mutuo se la mia entrata si ferma?',
			never: 'that a policy is needed'
		},
		'DE-08': {
			text: 'Non è nota la cifra totale delle rate: la mappa non può dire quanto pesano sulle entrate, né quanto resta a fine mese.',
			question: 'Quanto pago di rate, in tutto, ogni mese?'
		},
		'DE-12': {
			text: {
				salary_loan:
					'La cessione del quinto si trattiene dallo stipendio o dalla pensione: se le entrate indicate ne sono già al netto, quella rata compare due volte. Per questo la mappa calcola il fine mese in tutti e due i modi.',
				overdraft:
					'Un fido non ha una rata fissa: quanto pesa ogni mese dipende da quanto viene usato, e la cifra delle rate può comprenderlo oppure no.'
			},
			question: 'Quanto pesano davvero, ogni mese, cessione del quinto e fido?',
			never: 'that the credit is expensive or should be closed'
		},

		// SA, Risparmi, investimenti e patrimonio
		'SA-01': {
			text: {
				cannot:
					'Oggi non si riesce a mettere nulla da parte: tutto quello che entra serve al mese in corso.',
				share:
					'Ogni mese si mettono da parte {saving_eur}: {saving_share} di quello che entra, {saving_year_eur} in un anno.',
				amount: 'Ogni mese si mettono da parte {saving_eur}: {saving_year_eur} in un anno.'
			}
		},
		'SA-02': {
			text: "{goal_name_cap} è tra le cose che contano per voi, e oggi non c'è una quota del reddito messa da parte con regolarità: tra l'obiettivo e le abitudini di ogni mese manca ancora il collegamento.",
			question: 'Da quale cifra, anche piccola, si può cominciare?',
			never: 'amounts or percentages to save'
		},
		'SA-03': {
			text: {
				one: "C'è una cosa per cui volete avere dei soldi, e i risparmi non hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un collegamento.",
				many: "Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e i risparmi non hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un collegamento."
			},
			question: 'Quali dei miei risparmi servono a quale obiettivo?',
			never: 'how to split the savings'
		},
		'SA-15': {
			text: {
				one: "C'è una cosa per cui volete avere dei soldi, e gli obiettivi dei risparmi ci sono ma non sono ancora definiti: non è chiaro quanta parte serva a quella cosa, né per quando.",
				many: 'Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e gli obiettivi dei risparmi ci sono ma non sono ancora definiti: non è chiaro quale parte serva a quale, né per quando.'
			},
			question: 'Quale parte dei miei risparmi serve a quale obiettivo, e per quando?',
			never: 'how to split the savings, or amounts and timing'
		},
		'SA-05': {
			text: {
				neither:
					'Degli investimenti non si conoscono né i costi né i rendimenti: la mappa non può dire che cosa producono, né quanto trattengono ogni anno.',
				returns_only:
					'Degli investimenti si conosce il rendimento ma non il costo: senza il secondo, il primo non dice quanto resta davvero.',
				costs_only:
					'Degli investimenti si conosce il costo ma non il rendimento: non si può ancora dire che cosa resta, tolti i costi.'
			},
			question: 'Quanto mi costano e quanto rendono, davvero, gli investimenti che ho?',
			never: 'that the costs are high or that anything should be changed'
		},
		'SA-07': {
			text: 'Gli investimenti di oggi sono stati scelti affidandosi alla banca o alle Poste, e i risparmi non hanno ancora uno scopo preciso: manca il termine con cui confrontare quella scelta.',
			question: 'Per quale motivo i miei risparmi sono dove sono oggi?',
			never: 'criticism of the bank or the post office'
		},
		'SA-08': {
			text: "I risparmi sono in {holdings_count} forme diverse; quanto siano davvero diverse tra loro, e quanto costino insieme, dipende da cosa c'è dentro ciascuna.",
			question: "Che cosa c'è dentro i prodotti che ho?",
			never: 'that risk is high or badly spread'
		},
		'SA-09': {
			text: "Una parte di ciò che avete è in immobili o in un'attività: è ricchezza che non diventa denaro in poco tempo.",
			question: 'Su quali risorse posso contare in tempi brevi, e su quali no?',
			never: 'selling property or shares'
		},
		'SA-12': {
			text: {
				share: 'Di quello che si mette da parte ogni mese, {pac_share} va in piani di accumulo.',
				amount: 'Nei piani di accumulo vanno {pac_eur} al mese: {pac_year_eur} in un anno.'
			}
		},
		'SA-13': {
			text: {
				years:
					'Gli investimenti di oggi sono stati scelti o modificati {review_phrase}: da allora possono essere cambiati i prodotti, i costi e le cose per cui servono i soldi.',
				unknown:
					"Non è noto quando gli investimenti di oggi siano stati scelti o modificati l'ultima volta: non si può dire se rispecchino ancora le cose per cui servono i soldi."
			},
			question: 'Che cosa è cambiato da quando ho scelto i miei investimenti?',
			never: 'that they should be reviewed or changed'
		},
		'SA-14': {
			text: 'Il valore complessivo di ciò che avete non è noto con sicurezza: senza un totale, non si può dire quale parte sia disponibile subito, quale investita e quale in immobili o attività.',
			question: 'Quanto vale, in tutto, quello che possiedo?'
		},

		// PR, Protezione e passaggio generazionale
		'PR-01': {
			text: {
				missing:
					'Tre mesi di spese fisse e rate valgono {three_months_eur}; da parte, subito disponibili, ci sono {liquidity_eur}: ne mancherebbero {missing_three_eur}.',
				covered:
					'Tre mesi di spese fisse e rate valgono {three_months_eur}: la liquidità li copre per intero.',
				maybe:
					'Tre mesi di spese fisse e rate valgono {three_months_eur}: la liquidità può bastare oppure no, a seconda di dove cadono le cifre dentro le fasce scelte.',
				plain: 'Tre mesi di spese fisse e rate valgono {three_months_eur}.'
			},
			never: 'how many months should be covered'
		},
		'PR-02': {
			text: {
				sole: "Il tuo reddito è l'unica entrata di una famiglia con {children_phrase}, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, si ferma tutto insieme.",
				main: "Il tuo reddito è la fonte principale di una famiglia con {children_phrase}, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, resta solo quello che portano gli altri."
			},
			question: 'Che cosa succederebbe in casa se la mia entrata si fermasse?',
			never: 'that a policy is needed'
		},
		'PR-03': {
			text: "{dependent_children_phrase}, e non c'è nessuna tutela per scomparsa o impossibilità di lavorare: quello che verrebbe a mancare ricadrebbe sulle entrate e sui risparmi della famiglia.",
			question: 'Quali imprevisti peserebbero di più sulla mia famiglia?',
			never: 'that a policy is needed'
		},
		'PR-06': {
			text: "Con un lavoro in proprio l'entrata dipende dal poter lavorare, e tra le coperture che hai nessuna riguarda l'invalidità o l'inabilità al lavoro.",
			question: 'Che cosa succede alle mie entrate se non posso lavorare per un periodo?',
			never: 'that the person should take out insurance'
		},
		'PR-07': {
			text: {
				one: 'Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro caso riguarda {assets_list}.',
				more: 'Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro caso riguarda insieme {assets_list}.'
			},
			question: 'Che cosa devo sapere per proteggere quello che ho?',
			never: 'succession or legal solutions'
		},
		'PR-08': {
			text: 'Non è noto se ci siano coperture per scomparsa o impossibilità di lavorare: la mappa non può dire che cosa resterebbe a carico della famiglia se la tua entrata si fermasse.',
			question: 'Quali coperture ho già, anche attraverso il lavoro o il mutuo?'
		},
		'PR-09': {
			text: "Se tu non potessi lavorare per qualche mese, l'attività {dependency_phrase}: nel frattempo spese fisse e rate conterebbero sulla liquidità, che ne copre {cover_months}.",
			question:
				"Che cosa succede all'attività, e alle entrate di casa, se mi fermo per un periodo?",
			never: 'insurance, a key-person cover or how many months would be right'
		},
		'PR-10': {
			text: "Pianificare il passaggio generazionale è tra le cose che contano per voi, e oggi l'attività si ferma se ti fermi tu: quello che si passerebbe dipende ancora da una sola persona.",
			question: 'Che cosa vuol dire, per la mia attività, prepararne il passaggio?',
			never: 'timing, legal or corporate solutions, or the value of the business'
		},
		'PR-11': {
			text: {
				thought:
					'{goal_name_cap} è tra le cose che contano per voi; a come trasferire il patrimonio agli eredi si è pensato, ma non è ancora stato fatto nulla.',
				open: '{goal_name_cap} è tra le cose che contano per voi, e come trasferire il patrimonio agli eredi non è ancora stato affrontato.'
			},
			question: 'Che cosa succederebbe oggi a quello che ho, se dovesse passare ad altri?',
			never: 'legal instruments, wills, donations or timing'
		},
		'PR-12': {
			text: {
				by_law:
					'La successione è vista come qualcosa che la legge regola da sé: in assenza di scelte, la legge stabilisce chi riceve e in quali parti, e il risultato è quello, non uno deciso.',
				too_small:
					'Il patrimonio è considerato troppo piccolo per pensare alla successione, ma il suo valore complessivo non è noto con sicurezza.'
			},
			question: 'Che cosa succede oggi a quello che ho, se non decido nulla?',
			never: 'that a will or other instrument is needed'
		},
		'PR-13': {
			text: {
				one: 'Non è chiaro chi siano gli eredi: è il primo dato da cui dipende qualsiasi passaggio del patrimonio, e senza, la mappa non può dire a chi andrebbe {assets_list}.',
				more: 'Non è chiaro chi siano gli eredi: è il primo dato da cui dipende qualsiasi passaggio del patrimonio, e senza, la mappa non può dire a chi andrebbero {assets_list}.'
			},
			question: 'Chi sono, oggi, i miei eredi?',
			never: 'legal advice'
		},
		'PR-14': {
			text: "Garantire un futuro economico ai figli è tra le cose che contano per voi, e oggi a nome dei figli non c'è né un fondo pensione né un piano di accumulo.",
			question: "Che cosa c'è già, oggi, a nome dei miei figli?",
			never: 'that they should open one'
		},

		// PE, Pensione e TFR
		'PE-01': {
			text: {
				all: 'Gli elementi che descrivono la pensione futura sono {pension_total_phrase}, e sono tutti noti.',
				none: 'Degli elementi che descrivono la pensione futura ({pension_elements}) non ne è noto nessuno: finché mancano, la mappa non può dire nulla su quanto entrerà in casa dopo il lavoro.',
				some: 'Degli elementi che descrivono la pensione futura ({pension_elements}) {pension_known_phrase}: finché mancano gli altri, la mappa non può dire nulla su quanto entrerà in casa dopo il lavoro.'
			}
		},
		'PE-02': {
			text: {
				forgot:
					'{goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un numero di partenza: una simulazione della pensione è stata fatta, ma il risultato non è rimasto.',
				never:
					'{goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un numero di partenza: una simulazione della pensione non è mai stata fatta.'
			},
			question: 'Dove trovo una simulazione della mia pensione, e come si legge?',
			never: 'amounts or retirement ages'
		},
		'PE-03': {
			text: "{age_phrase_cap} la pensione è l'entrata dei prossimi anni, e oggi non ha ancora una cifra.",
			question: 'Che cosa posso già sapere oggi sulla mia pensione?',
			never: 'that it is late'
		},
		'PE-04': {
			text: 'Ogni mese una parte dello stipendio va nel TFR: non è noto dove, e quindi nemmeno quanto si è accumulato finora.',
			question: 'Dove va il mio TFR, e quanto si è accumulato?',
			never: 'which destination is better'
		},
		'PE-05': {
			text: 'Con un lavoro in proprio la pensione si costruisce con i contributi versati: quanto stiano costruendo, finora, non è stato guardato.',
			question: 'Che pensione sto costruendo con i contributi che verso?',
			never: 'paying in more'
		},
		'PE-07': {
			text: "C'è un fondo pensione, ma non è noto di che tipo: da questo dipendono costi, regole e quello che succede ai versamenti, e la mappa non può dire altro.",
			question: 'Che tipo di fondo pensione ho, e come funziona?',
			never: 'which kind is better'
		}
	},

	wording: {
		unit: { long: 'euro', short: '€' },
		euros: {
			between: 'tra {lo} e {hi} {unit}',
			up_to: 'fino a {hi} {unit}',
			at_least: 'almeno {lo} {unit}'
		},
		months: {
			under_one: 'meno di un mese',
			one: 'fino a circa un mese',
			over_year: 'più di un anno',
			up_to: 'fino a circa {hi} mesi',
			beyond: 'oltre {lo} mesi',
			between: 'tra circa {lo} e {hi} mesi'
		},
		weeks: {
			between: 'tra {lo} e {hi} settimane',
			about: 'circa {n} settimane',
			up_to: 'fino a {hi} settimane',
			at_least: 'almeno {lo} settimane'
		},
		share: {
			between: 'tra il {lo}% e il {hi}%',
			up_to: 'fino al {hi}%',
			at_least: 'almeno il {lo}%'
		},
		and: 'e',
		// "il 80%" and "al 85%" are read with a vowel: "l'80%", "all'85%".
		polish: (text: string) =>
			text.replace(/\bil (?=8[05]%)/g, "l'").replace(/\bal (?=8[05]%)/g, "all'"),
		phrases: {
			children: { 1: 'un figlio', 2: 'due figli', 3: 'tre o più figli' },
			dependent_children: {
				some: 'Alcuni figli dipendono ancora economicamente da te',
				one: 'Un figlio dipende ancora economicamente da te',
				many: 'I figli dipendono ancora economicamente da te'
			},
			// Number in letters, up to six (the kinds of debt in the survey).
			debt_count: {
				1: 'Un impegno a rate che vale',
				2: 'Due impegni a rate che insieme valgono',
				3: 'Tre impegni a rate che insieme valgono',
				4: 'Quattro impegni a rate che insieme valgono',
				5: 'Cinque impegni a rate che insieme valgono',
				6: 'Sei impegni a rate che insieme valgono'
			},
			dependency: {
				slows: 'andrebbe avanti, ma con meno entrate',
				stops: 'si fermerebbe, e con lei la tua entrata'
			},
			// Counts below ten are written in letters.
			count: {
				4: 'quattro',
				5: 'cinque',
				6: 'sei',
				7: 'sette',
				8: 'otto',
				9: 'nove',
				10: 'dieci'
			},
			goals_count: {
				1: 'una',
				2: 'due',
				3: 'tre',
				4: 'quattro',
				5: 'cinque',
				6: 'sei',
				7: 'sette',
				8: 'otto',
				9: 'nove',
				10: 'dieci'
			},
			goal: GOAL_NAMES,
			missing_io: {
				income: 'la cifra delle entrate',
				fixed: 'la cifra delle spese fisse',
				both: 'la cifra delle entrate e quella delle spese fisse'
			},
			tax: {
				irregular: 'Per tasse e contributi i soldi si mettono da parte, ma non con regolarità',
				struggle: 'Per tasse e contributi è difficile mettere da parte i soldi in anticipo'
			},
			review: { '5_10': 'tra cinque e dieci anni fa', over_10: 'più di dieci anni fa' },
			assets: {
				home: 'la casa',
				other_property: 'gli altri immobili',
				investments: 'gli investimenti',
				business: "l'attività",
				covers: 'le coperture'
			},
			age: { '46_55': 'Tra i 46 e i 55 anni', '56_65': 'Tra i 56 e i 65 anni' },
			pension_elements: {
				employee: "dove va il TFR, se c'è un fondo e di che tipo, una simulazione della pensione",
				other: "se c'è un fondo e di che tipo, una simulazione della pensione"
			},
			pension_total: { 2: 'due', 3: 'tre' },
			pension_known: { 1: 'ne è noto uno', 2: 'ne sono noti due' }
		}
	},

	areaTitles: {
		IO: 'Entrate e uscite',
		RI: 'Riserva per gli imprevisti',
		DE: 'Debiti e rate',
		SA: 'Risparmi, investimenti e patrimonio',
		PR: 'Protezione e passaggio generazionale',
		PE: 'Pensione e TFR'
	},

	retired: 'Sei già in pensione: questa parte non ti riguarda.',
	withheldLine: 'Alcune risposte non sono state indicate.',

	gather: {
		payslip: "L'ultima busta paga (o l'ultima dichiarazione dei redditi)",
		statement: "L'estratto conto degli ultimi tre mesi",
		loans: 'I contratti o i piani delle rate in corso',
		products: 'Il rendiconto degli investimenti e dei prodotti di risparmio',
		policies: 'Le polizze che avete, anche quelle legate al mutuo',
		inps: 'La simulazione della pensione dal sito INPS o della cassa',
		fund: 'Il documento informativo del fondo pensione',
		taxes: "Le scadenze di tasse e contributi dell'ultimo anno (F24)",
		assets: 'Un elenco di quello che possedete, con il suo valore indicativo'
	},

	numbers: {
		labels: ['A fine mese', 'La riserva copre', 'Le rate in un anno', 'Tre mesi di spese e rate'],
		margin: {
			surplus: 'restano {value}',
			shortfall: 'mancano {value}',
			close: 'da +{margin_hi} a −{gap_hi} €'
		},
		noInstalments: 'nessuna rata'
	},

	snapshot: {
		context: {
			separator: ' · ',
			household: {
				single: 'Una persona',
				married: 'Una coppia',
				separated: 'Una persona separata o divorziata',
				widowed: 'Una persona vedova'
			},
			withChildren: ' con {children_phrase}',
			incomes: {
				sole: 'una sola entrata in casa',
				main: "la tua è l'entrata principale",
				shared: 'più entrate in casa',
				secondary: "la tua è un'entrata secondaria"
			},
			work: {
				employee: 'lavoro dipendente',
				professional: 'libera professione',
				entrepreneur: "un'attività propria",
				self_employed: 'lavoro autonomo',
				retired: 'in pensione'
			},
			housing: {
				main_home: 'casa di proprietà{mortgage}',
				other_only: 'immobili di proprietà, non la prima casa',
				both: 'casa di proprietà{mortgage} e altri immobili',
				none: 'nessun immobile di proprietà'
			},
			withMortgage: ' con mutuo'
		},

		goals: {
			onlyOther: 'Obiettivi diversi da quelli elencati.',
			saving: {
				amount: 'Ogni mese si mettono da parte {saving_eur}',
				pac: ', di cui {pac_eur} in piani di accumulo',
				cannot: 'Al momento non si riesce a mettere da parte nulla',
				no_quota: 'Una quota da mettere da parte non è ancora stata fissata'
			}
		},

		chosen: {
			self: 'Gli investimenti di oggi sono stati scelti in autonomia.',
			bank: 'Gli investimenti di oggi sono stati scelti affidandosi alla banca.',
			advisor: 'Gli investimenti di oggi sono stati scelti con un consulente finanziario.',
			post_office: 'Gli investimenti di oggi sono stati scelti con un consulente di Poste Italiane.'
		}
	}
};
