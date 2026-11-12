# Libro delle regole della mappa

Versione regole: 1.0.1. 50 regole.

Ogni testo qui sotto è un modello approvabile: le parti tra graffe vengono riempite dai valori calcolati.
Se una regola ha più varianti, vale la prima la cui condizione è vera (l'ordine è quello della lista).
La riga "Da non far intendere" serve a chi rivede e non viene mai stampata.

## IO-01 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: margin
- Approvata: sì

Variante `surplus`: Pagate le spese fisse e le rate, ogni mese restano {margin_eur} per tutto il resto: spese libere, imprevisti e risparmio insieme.

Variante `shortfall`: Spese fisse e rate superano le entrate: ogni mese mancano {gap_eur}.

Variante `even`: Spese fisse e rate assorbono tutte le entrate: a fine mese non resta nulla, o mancano {gap_eur}.

Variante `close`: Entrate, spese fisse e rate sono vicine: con le fasce scelte, a fine mese possono restare fino a {margin_hi} euro oppure mancarne fino a {gap_hi}.

Domanda da portare: (nessuna)

Da non far intendere: a right or wrong level of spending

## IO-02 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: 1 (spese e rate sopra le entrate)
- Legge: margin, tracking
- Approvata: sì

Variante `untracked`: Ogni mese spese fisse e rate assorbono tutte le entrate, o le superano, e oggi entrate e uscite non vengono seguite con regolarità: da dove arrivi la differenza, la mappa non lo vede.

Variante `plain`: Ogni mese spese fisse e rate assorbono tutte le entrate, o le superano: la differenza viene coperta con risparmi, aiuti o credito, e con quale dei tre la mappa non lo vede.

Domanda da portare: Da dove si può partire per rimettere in pari entrate e uscite?

Da non far intendere: that investments or products can recover the gap

## IO-03 (Entrate e uscite)

- Area: IO
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: margin, marginYear, saving_habit
- Approvata: sì

Variante `cannot`: Sulla carta, pagate spese fisse e rate, restano {margin_eur} al mese, eppure oggi non si riesce a mettere nulla da parte: in un anno sono {margin_year_eur} di cui la mappa non vede la destinazione.

Variante `no_quota`: Pagate spese fisse e rate, restano {margin_eur} al mese, e una quota da mettere da parte non è mai stata fissata: in un anno sono {margin_year_eur} senza una destinazione stabilita.

Domanda da portare: Dove finisce quello che resta a fine mese?

Da non far intendere: how much should be saved

## IO-04 (Entrate e uscite)

- Area: IO
- Prospettiva: strategia
- Livello: 5 (altre letture)
- Legge: income_role, marital, fixed
- Approvata: sì

Testo: In una famiglia di due adulti il tuo reddito è l'unica entrata: le spese fisse, {fixed_eur} al mese, poggiano tutte su di te.

Domanda da portare: Come si organizza la casa se la mia entrata cambia?

Da non far intendere: forecasts about work or income, or that the partner should work

## IO-05 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: income, fixed
- Approvata: sì

Testo: Manca {missing_io}: senza, la mappa non può calcolare quanto resta a fine mese né quanto pesano rate e risparmio. È il numero da cui dipende quasi tutto il resto.

Domanda da portare: Come ricostruisco quanto entra e quanto esce davvero in un mese?

Da non far intendere: a judgement on the person

## IO-06 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: 6 (punto fermo, mai in evidenza)
- Legge: tracking, saving_habit, margin
- Approvata: sì

Testo: Entrate, spese e risparmio sono seguiti con regolarità: di quello che resta ogni mese si sa già dove va.

Domanda da portare: (nessuna)

Da non far intendere: (nessuna nota)

## IO-07 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: separate_accounts, income, fixed
- Approvata: sì

Testo: I soldi dell'attività e quelli personali stanno, almeno in parte, sugli stessi conti: le cifre di entrate e spese fisse possono mescolare le due cose, e con loro quello che la mappa calcola a fine mese.

Domanda da portare: Quanto di quello che entra e che esce riguarda la casa, e quanto l'attività?

Da non far intendere: that the accounts should be separated

## IO-08 (Entrate e uscite)

- Area: IO
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: saving_amount, margin
- Approvata: sì

Testo: Ogni mese si mettono da parte almeno {saving_lo} euro, più di quanto resta sulla carta dopo spese fisse e rate: una delle cifre di entrate, spese o risparmio non torna, e con lei i calcoli della mappa.

Domanda da portare: Quanto entra, quanto esce e quanto resta, davvero, in un mese?

Da non far intendere: that the person is wrong

## RI-01 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: coverMonths
- Approvata: sì

Testo: I soldi disponibili subito coprono {cover_months} di spese fisse e rate.

Domanda da portare: (nessuna)

Da non far intendere: that the reserve is enough or not enough

## RI-02 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: shockAmount, shockWeeks, liquidity, shockShare
- Approvata: sì

Variante `plain`: Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate.

Variante `above_reserve`: Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate, ed è più di tutto quello che c'è da parte.

Variante `share`: Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate, e {shock_share} di quello che è disponibile subito.

Domanda da portare: (nessuna)

Da non far intendere: (nessuna nota)

## RI-03 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: protezione
- Livello: 2 (persone e protezione)
- Legge: dependentChildren, emergency, children_independent, children
- Approvata: sì

Variante `probably_no`: {dependent_children_phrase}, e per un imprevisto importante la liquidità probabilmente non basterebbe: ricadrebbe sulle spese di tutti i giorni.

Variante `sell_investments`: {dependent_children_phrase}, e per un imprevisto importante servirebbe usare o vendere gli investimenti: la liquidità da sola non basterebbe.

Domanda da portare: Che cosa succede in casa se arriva una spesa importante e imprevista?

Da non far intendere: how many months would be right

## RI-04 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: emergency, coverMonths
- Approvata: sì

Variante `not_enough`: La liquidità copre almeno sei mesi di spese fisse e rate, eppure per un imprevisto importante non sembra bastare: o è già destinata ad altro, o l'imprevisto che si ha in mente è più grande. Quale dei due, la mappa non lo vede.

Variante `enough`: La liquidità è considerata sufficiente per un imprevisto importante; in spese fisse e rate vale {cover_months}.

Domanda da portare: Per quale imprevisto basta, davvero, la liquidità che ho?

Da non far intendere: that the money should be used or moved

## RI-05 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: emergency, saving_habit, saving_amount, outgoings
- Approvata: sì

Testo: Per un imprevisto importante la liquidità probabilmente non basterebbe, e oggi non si mette da parte nulla con regolarità: un mese di spese fisse e rate vale {outgoings_eur}.

Domanda da portare: Su che cosa potrei contare per un imprevisto importante?

Da non far intendere: amounts or percentages to save

## RI-06 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: strategia
- Livello: 5 (altre letture)
- Legge: coverMonths, investments, purpose
- Approvata: sì

Testo: Sul conto c'è più di un anno di spese fisse e rate, e i risparmi stanno soprattutto lì: oltre a quello che serve per gli imprevisti, il resto non ha ancora uno scopo preciso.

Domanda da portare: A cosa servono, e quando, i soldi che ho sul conto?

Da non far intendere: that they should be invested

## RI-07 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: liquidity, fixed
- Approvata: sì

Variante `liquidity`: Non è nota la cifra disponibile subito: la mappa non può dire per quanto tempo reggerebbero spese fisse e rate.

Variante `fixed`: Da parte ci sono {liquidity_eur}; senza la cifra delle spese fisse non si possono tradurre in mesi.

Domanda da portare: Quanti soldi potrei usare davvero da un giorno all'altro?

Da non far intendere: (nessuna nota)

## RI-08 (Riserva per gli imprevisti)

- Area: RI
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: tax_reserve, coverMonths
- Approvata: sì

Variante `months`: {tax_phrase}: alle scadenze di saldo e acconti i soldi arrivano dalla stessa liquidità che serve per gli imprevisti, e quella davvero libera è meno di quanto appare.

Variante `plain`: {tax_phrase}: alle scadenze di saldo e acconti i soldi devono arrivare dalla liquidità o dalle entrate di quei mesi.

Domanda da portare: Quanto pesano, e quando arrivano, le mie scadenze di tasse e contributi?

Da non far intendere: amounts or percentages to set aside, or how to organise the accounts

## DE-01 (Debiti e rate)

- Area: DE
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: debt_types, instalments, instalmentsYear, instalmentShare
- Approvata: sì

Variante `none`: Nessuna rata in corso: tutte le entrate sono libere da impegni presi in passato.

Variante `all_income`: {debt_count_phrase} {instalments_year_eur} l'anno: tutte le entrate indicate, o più.

Variante `share`: {debt_count_phrase} {instalments_year_eur} l'anno: {instalment_share} di quello che entra.

Variante `amount`: {debt_count_phrase} {instalments_year_eur} l'anno.

Domanda da portare: (nessuna)

Da non far intendere: a sustainability threshold

## DE-06 (Debiti e rate)

- Area: DE
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: debt_types, saving_habit
- Approvata: sì

Testo: Nello stesso periodo una parte dei soldi viene messa da parte e un'altra paga un prestito o un fido: sono due movimenti opposti, e quale dei due pesi di più dipende da costi che la mappa non ha.

Domanda da portare: Come stanno insieme quello che metto da parte e quello che pago per prestiti e fidi?

Da non far intendere: paying off debts with savings

## DE-07 (Debiti e rate)

- Area: DE
- Prospettiva: protezione
- Livello: 2 (persone e protezione)
- Legge: debt_types, income_role, life_cover
- Approvata: sì

Variante `sole`: Il mutuo poggia sul tuo reddito, l'unico della famiglia, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, la rata resta.

Variante `main`: Il mutuo poggia soprattutto sul tuo reddito, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, la rata resta.

Domanda da portare: Che cosa succede al mutuo se la mia entrata si ferma?

Da non far intendere: that a policy is needed

## DE-08 (Debiti e rate)

- Area: DE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: debtCount, instalments
- Approvata: sì

Testo: Non è nota la cifra totale delle rate: la mappa non può dire quanto pesano sulle entrate, né quanto resta a fine mese.

Domanda da portare: Quanto pago di rate, in tutto, ogni mese?

Da non far intendere: (nessuna nota)

## DE-12 (Debiti e rate)

- Area: DE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: debt_types
- Approvata: sì

Variante `salary_loan`: La cessione del quinto si trattiene dallo stipendio o dalla pensione: se le entrate indicate ne sono già al netto, quella rata compare due volte. Per questo la mappa calcola il fine mese in tutti e due i modi.

Variante `overdraft`: Un fido non ha una rata fissa: quanto pesa ogni mese dipende da quanto viene usato, e la cifra delle rate può comprenderlo oppure no.

Domanda da portare: Quanto pesano davvero, ogni mese, cessione del quinto e fido?

Da non far intendere: that the credit is expensive or should be closed

## SA-01 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: saving_habit, saving_amount, savingShare, savingYear
- Approvata: sì

Variante `cannot`: Oggi non si riesce a mettere nulla da parte: tutto quello che entra serve al mese in corso.

Variante `share`: Ogni mese si mettono da parte {saving_eur}: {saving_share} di quello che entra, {saving_year_eur} in un anno.

Variante `amount`: Ogni mese si mettono da parte {saving_eur}: {saving_year_eur} in un anno.

Domanda da portare: (nessuna)

Da non far intendere: (nessuna nota)

## SA-02 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: goals, saving_habit, saving_amount
- Approvata: sì

Testo: {goal_name_cap} è tra le cose che contano per voi, e oggi non c'è una quota del reddito messa da parte con regolarità: tra l'obiettivo e le abitudini di ogni mese manca ancora il collegamento.

Domanda da portare: Da quale cifra, anche piccola, si può cominciare?

Da non far intendere: amounts or percentages to save

## SA-03 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: purpose, goals, saving_habit, investments
- Approvata: sì

Variante `one`: C'è una cosa per cui volete avere dei soldi, e i risparmi non hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un collegamento.

Variante `many`: Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e i risparmi non hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un collegamento.

Domanda da portare: Quali dei miei risparmi servono a quale obiettivo?

Da non far intendere: how to split the savings

## SA-05 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: costs_returns
- Approvata: sì

Variante `neither`: Degli investimenti non si conoscono né i costi né i rendimenti: la mappa non può dire che cosa producono, né quanto trattengono ogni anno.

Variante `returns_only`: Degli investimenti si conosce il rendimento ma non il costo: senza il secondo, il primo non dice quanto resta davvero.

Variante `costs_only`: Degli investimenti si conosce il costo ma non il rendimento: non si può ancora dire che cosa resta, tolti i costi.

Domanda da portare: Quanto mi costano e quanto rendono, davvero, gli investimenti che ho?

Da non far intendere: that the costs are high or that anything should be changed

## SA-07 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: strategia
- Livello: 5 (altre letture)
- Legge: chosen_by, purpose
- Approvata: sì

Testo: Gli investimenti di oggi sono stati scelti affidandosi alla banca o alle Poste, e i risparmi non hanno ancora uno scopo preciso: manca il termine con cui confrontare quella scelta.

Domanda da portare: Per quale motivo i miei risparmi sono dove sono oggi?

Da non far intendere: criticism of the bank or the post office

## SA-08 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: chiarezza
- Livello: 5 (altre letture)
- Legge: holdingsCount
- Approvata: sì

Testo: I risparmi sono in {holdings_count} forme diverse; quanto siano davvero diverse tra loro, e quanto costino insieme, dipende da cosa c'è dentro ciascuna.

Domanda da portare: Che cosa c'è dentro i prodotti che ho?

Da non far intendere: that risk is high or badly spread

## SA-09 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: strategia
- Livello: 5 (altre letture)
- Legge: property, holdings, work
- Approvata: sì

Testo: Una parte di ciò che avete è in immobili o in un'attività: è ricchezza che non diventa denaro in poco tempo.

Domanda da portare: Su quali risorse posso contare in tempi brevi, e su quali no?

Da non far intendere: selling property or shares

## SA-12 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: pac, pac_amount, saving_amount, pacShare, pacYear
- Approvata: sì

Variante `share`: Di quello che si mette da parte ogni mese, {pac_share} va in piani di accumulo.

Variante `amount`: Nei piani di accumulo vanno {pac_eur} al mese: {pac_year_eur} in un anno.

Domanda da portare: (nessuna)

Da non far intendere: (nessuna nota)

## SA-13 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: strategia
- Livello: 5 (altre letture)
- Legge: last_review
- Approvata: sì

Variante `years`: Gli investimenti di oggi sono stati scelti o modificati {review_phrase}: da allora possono essere cambiati i prodotti, i costi e le cose per cui servono i soldi.

Variante `unknown`: Non è noto quando gli investimenti di oggi siano stati scelti o modificati l'ultima volta: non si può dire se rispecchino ancora le cose per cui servono i soldi.

Domanda da portare: Che cosa è cambiato da quando ho scelto i miei investimenti?

Da non far intendere: that they should be reviewed or changed

## SA-14 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: wealth_estimate, property, investments, holdings, work
- Approvata: sì

Testo: Il valore complessivo di ciò che avete non è noto con sicurezza: senza un totale, non si può dire quale parte sia disponibile subito, quale investita e quale in immobili o attività.

Domanda da portare: Quanto vale, in tutto, quello che possiedo?

Da non far intendere: (nessuna nota)

## SA-15 (Risparmi, investimenti e patrimonio)

- Area: SA
- Prospettiva: coerenza
- Livello: 5 (altre letture)
- Legge: purpose, goals, saving_habit, investments
- Approvata: sì

Variante `one`: C'è una cosa per cui volete avere dei soldi, e gli obiettivi dei risparmi ci sono ma non sono ancora definiti: non è chiaro quanta parte serva a quella cosa, né per quando.

Variante `many`: Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e gli obiettivi dei risparmi ci sono ma non sono ancora definiti: non è chiaro quale parte serva a quale, né per quando.

Domanda da portare: Quale parte dei miei risparmi serve a quale obiettivo, e per quando?

Da non far intendere: how to split the savings, or amounts and timing

## PR-01 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: protezione
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: threeMonths, liquidity, missingThree
- Approvata: sì

Variante `missing`: Tre mesi di spese fisse e rate valgono {three_months_eur}; da parte, subito disponibili, ci sono {liquidity_eur}: ne mancherebbero {missing_three_eur}.

Variante `covered`: Tre mesi di spese fisse e rate valgono {three_months_eur}: la liquidità li copre per intero.

Variante `maybe`: Tre mesi di spese fisse e rate valgono {three_months_eur}: la liquidità può bastare oppure no, a seconda di dove cadono le cifre dentro le fasce scelte.

Variante `plain`: Tre mesi di spese fisse e rate valgono {three_months_eur}.

Domanda da portare: (nessuna)

Da non far intendere: how many months should be covered

## PR-02 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: protezione
- Livello: 2 (persone e protezione)
- Legge: income_role, children, children_independent, life_cover
- Approvata: sì

Variante `sole`: Il tuo reddito è l'unica entrata di una famiglia con {children_phrase}, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, si ferma tutto insieme.

Variante `main`: Il tuo reddito è la fonte principale di una famiglia con {children_phrase}, e non c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, resta solo quello che portano gli altri.

Domanda da portare: Che cosa succederebbe in casa se la mia entrata si fermasse?

Da non far intendere: that a policy is needed

## PR-03 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: protezione
- Livello: 2 (persone e protezione)
- Legge: life_cover, dependentChildren, children_independent, income_role, children
- Approvata: sì

Testo: {dependent_children_phrase}, e non c'è nessuna tutela per scomparsa o impossibilità di lavorare: quello che verrebbe a mancare ricadrebbe sulle entrate e sui risparmi della famiglia.

Domanda da portare: Quali imprevisti peserebbero di più sulla mia famiglia?

Da non far intendere: that a policy is needed

## PR-06 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: protezione
- Livello: 5 (altre letture)
- Legge: work, life_cover
- Approvata: sì

Testo: Con un lavoro in proprio l'entrata dipende dal poter lavorare, e tra le coperture che hai nessuna riguarda l'invalidità o l'inabilità al lavoro.

Domanda da portare: Che cosa succede alle mie entrate se non posso lavorare per un periodo?

Da non far intendere: that the person should take out insurance

## PR-07 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: trasmissione
- Livello: 5 (altre letture)
- Legge: goals, property, investments, holdings, work, life_cover
- Approvata: sì

Variante `one`: Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro caso riguarda {assets_list}.

Variante `more`: Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro caso riguarda insieme {assets_list}.

Domanda da portare: Che cosa devo sapere per proteggere quello che ho?

Da non far intendere: succession or legal solutions

## PR-08 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: life_cover
- Approvata: sì

Testo: Non è noto se ci siano coperture per scomparsa o impossibilità di lavorare: la mappa non può dire che cosa resterebbe a carico della famiglia se la tua entrata si fermasse.

Domanda da portare: Quali coperture ho già, anche attraverso il lavoro o il mutuo?

Da non far intendere: (nessuna nota)

## PR-09 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: protezione
- Livello: 2 (persone e protezione)
- Legge: owner_dependency, coverMonths
- Approvata: sì

Testo: Se tu non potessi lavorare per qualche mese, l'attività {dependency_phrase}: nel frattempo spese fisse e rate conterebbero sulla liquidità, che ne copre {cover_months}.

Domanda da portare: Che cosa succede all'attività, e alle entrate di casa, se mi fermo per un periodo?

Da non far intendere: insurance, a key-person cover or how many months would be right

## PR-10 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: trasmissione
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: goals, owner_dependency
- Approvata: sì

Testo: Pianificare il passaggio generazionale è tra le cose che contano per voi, e oggi l'attività si ferma se ti fermi tu: quello che si passerebbe dipende ancora da una sola persona.

Domanda da portare: Che cosa vuol dire, per la mia attività, prepararne il passaggio?

Da non far intendere: timing, legal or corporate solutions, or the value of the business

## PR-11 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: goals, succession
- Approvata: sì

Variante `thought`: {goal_name_cap} è tra le cose che contano per voi; a come trasferire il patrimonio agli eredi si è pensato, ma non è ancora stato fatto nulla.

Variante `open`: {goal_name_cap} è tra le cose che contano per voi, e come trasferire il patrimonio agli eredi non è ancora stato affrontato.

Domanda da portare: Che cosa succederebbe oggi a quello che ho, se dovesse passare ad altri?

Da non far intendere: legal instruments, wills, donations or timing

## PR-12 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: trasmissione
- Livello: 4 (cose non note che la persona possiede)
- Legge: succession_reason, wealth_estimate, property, investments, holdings, work
- Approvata: sì

Variante `by_law`: La successione è vista come qualcosa che la legge regola da sé: in assenza di scelte, la legge stabilisce chi riceve e in quali parti, e il risultato è quello, non uno deciso.

Variante `too_small`: Il patrimonio è considerato troppo piccolo per pensare alla successione, ma il suo valore complessivo non è noto con sicurezza.

Domanda da portare: Che cosa succede oggi a quello che ho, se non decido nulla?

Da non far intendere: that a will or other instrument is needed

## PR-13 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: trasmissione
- Livello: 4 (cose non note che la persona possiede)
- Legge: heirs, property, investments, holdings, work
- Approvata: sì

Variante `one`: Non è chiaro chi siano gli eredi: è il primo dato da cui dipende qualsiasi passaggio del patrimonio, e senza, la mappa non può dire a chi andrebbe {assets_list}.

Variante `more`: Non è chiaro chi siano gli eredi: è il primo dato da cui dipende qualsiasi passaggio del patrimonio, e senza, la mappa non può dire a chi andrebbero {assets_list}.

Domanda da portare: Chi sono, oggi, i miei eredi?

Da non far intendere: legal advice

## PR-14 (Protezione e passaggio generazionale)

- Area: PR
- Prospettiva: trasmissione
- Livello: 5 (altre letture)
- Legge: children_pension, goals
- Approvata: sì

Testo: Garantire un futuro economico ai figli è tra le cose che contano per voi, e oggi a nome dei figli non c'è né un fondo pensione né un piano di accumulo.

Domanda da portare: Che cosa c'è già, oggi, a nome dei miei figli?

Da non far intendere: that they should open one

## PE-01 (Pensione e TFR)

- Area: PE
- Prospettiva: chiarezza
- Livello: F (fatto calcolato, mai in evidenza)
- Legge: tfr, pension_fund, pension_sim, pensionKnown, pensionTotal
- Approvata: sì

Variante `all`: Gli elementi che descrivono la pensione futura sono {pension_total_phrase}, e sono tutti noti.

Variante `none`: Degli elementi che descrivono la pensione futura ({pension_elements}) non ne è noto nessuno: finché mancano, la mappa non può dire nulla su quanto entrerà in casa dopo il lavoro.

Variante `some`: Degli elementi che descrivono la pensione futura ({pension_elements}) {pension_known_phrase}: finché mancano gli altri, la mappa non può dire nulla su quanto entrerà in casa dopo il lavoro.

Domanda da portare: (nessuna)

Da non far intendere: (nessuna nota)

## PE-02 (Pensione e TFR)

- Area: PE
- Prospettiva: coerenza
- Livello: 3 (obiettivi contro abitudini, tempi o risorse)
- Legge: goals, pension_sim
- Approvata: sì

Variante `forgot`: {goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un numero di partenza: una simulazione della pensione è stata fatta, ma il risultato non è rimasto.

Variante `never`: {goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un numero di partenza: una simulazione della pensione non è mai stata fatta.

Domanda da portare: Dove trovo una simulazione della mia pensione, e come si legge?

Da non far intendere: amounts or retirement ages

## PE-03 (Pensione e TFR)

- Area: PE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: age_band, pension_sim
- Approvata: sì

Testo: {age_phrase_cap} la pensione è l'entrata dei prossimi anni, e oggi non ha ancora una cifra.

Domanda da portare: Che cosa posso già sapere oggi sulla mia pensione?

Da non far intendere: that it is late

## PE-04 (Pensione e TFR)

- Area: PE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: tfr
- Approvata: sì

Testo: Ogni mese una parte dello stipendio va nel TFR: non è noto dove, e quindi nemmeno quanto si è accumulato finora.

Domanda da portare: Dove va il mio TFR, e quanto si è accumulato?

Da non far intendere: which destination is better

## PE-05 (Pensione e TFR)

- Area: PE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: work, pension_sim
- Approvata: sì

Testo: Con un lavoro in proprio la pensione si costruisce con i contributi versati: quanto stiano costruendo, finora, non è stato guardato.

Domanda da portare: Che pensione sto costruendo con i contributi che verso?

Da non far intendere: paying in more

## PE-07 (Pensione e TFR)

- Area: PE
- Prospettiva: chiarezza
- Livello: 4 (cose non note che la persona possiede)
- Legge: pension_fund
- Approvata: sì

Testo: C'è un fondo pensione, ma non è noto di che tipo: da questo dipendono costi, regole e quello che succede ai versamenti, e la mappa non può dire altro.

Domanda da portare: Che tipo di fondo pensione ho, e come funziona?

Da non far intendere: which kind is better
