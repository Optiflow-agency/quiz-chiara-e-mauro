# La tua mappa finanziaria: content spec

Status: **approved, ready for production** (rules 1.0.0, 2026-11-11). Built on the final
questionnaire approved by Mauro Schileo and Chiara Pieralli on 2026-11-09 ("QUESTIONARIO
CONOSCITIVO", 38 questions); the conditionals, the band fixes listed in section 10 and every map
sentence were approved by them on 2026-11-11.
This file is the single source for the survey catalogue, the rules and the PDF layout; the
code is built against it. Structure is in English, all respondent-facing copy is in Italian.

Hard rule: the map describes and orients, it never advises. No "devi", "dovresti",
"ti conviene", no adequacy judgement, no product, no projection.

---

## 1. Conventions

**Perimeter.** The respondent and their household. Welcome copy: "Rispondi pensando a te e alla
tua famiglia: a chi condivide con te entrate e spese."

**Field types.** `single`, `multi`, `band`, `textarea`. Nothing else.

**Escape answers.** Two reserved values, always with the same labels:

- `unknown` = "Non lo so"
- `withheld` = "Preferisco non dirlo"

`band` fields always offer both. `single` and `multi` fields offer the ones listed in their
`escapes` column, and every one offers at least `withheld`: a question cannot be skipped, so
declining goes through the escape (the client's choice, 2026-11-11). Only the two free-text
fields of S18 may be left blank; a blank one is read as withheld. In a `multi`, an escape or an `exclusive` option clears the other choices.
The questionnaire's own wordings of these answers ("Non sono in grado di calcolarlo",
"Non saprei", "Preferisco non indicarlo") are rendered with the two standard labels.

**Four answer states**, kept distinct everywhere: known value, `unknown`, `withheld`,
missing (never answered, or scheda not reached).

**Conditions.** Existing `display_when` mini-language (`==`, `!=`, `in`, `includes`, `AND`, `OR`),
plus one addition: `S01.marital missing` (no operand) holds when the field has no answer. It is
needed only by `income_household` (S05), so that a respondent who skipped Q2 still gets the
income question. An unanswered operand makes every other comparison false. A single option may
carry its own `display_when` (written after the option as "shown when …"): a hidden option is
not offered, and a stored answer that names it is dropped like the answer to a hidden field.

**Gate.** The consent/login gate sits after S03. S01-S03 ask for no amounts.

**Self-employed track.** `BUSINESS` = `S03.work in [professional,entrepreneur,self_employed]`
(only the respondent's own work). It shows S04 right after the gate, and a few rules.

**Retired.** `S03.work == retired` hides the pension questions about the respondent
(`pension_fund`, `pension_sim`); PE prints the retired line.

**Sections** (title screens): A "Per cominciare" (S01-S04), B "Entrate e uscite" (S05-S06),
C "Imprevisti e rate" (S07-S08), D "Risparmi e investimenti" (S09-S13), E "Protezione e
futuro" (S14-S15), F "Patrimonio e famiglia" (S16), G "Obiettivi e domande" (S17-S18).

**Question numbers.** `Qn` refers to the question number in the approved questionnaire.

---

## 2. Band sets

Monthly or total euros. `hi: null` is an open top band. Labels are the option text, as in the
questionnaire (Q12 and Q23 fixed, see section 10).

**`income_monthly`** (Q11, net per month)

| value       | label                 | lo    | hi    |
| ----------- | --------------------- | ----- | ----- |
| lt_1500     | Meno di 1.500 €       | 0     | 1500  |
| 1500_2500   | Tra 1.500 e 2.500 €   | 1500  | 2500  |
| 2500_5000   | Tra 2.500 e 5.000 €   | 2500  | 5000  |
| 5000_10000  | Tra 5.000 e 10.000 €  | 5000  | 10000 |
| 10000_25000 | Tra 10.000 e 25.000 € | 10000 | 25000 |
| gt_25000    | Più di 25.000 €       | 25000 | null  |

**`fixed_monthly`** (Q12, the family's fixed spending per month, **instalments excluded**)

| value     | label               | lo   | hi   |
| --------- | ------------------- | ---- | ---- |
| lt_800    | Meno di 800 €       | 0    | 800  |
| 800_1500  | Tra 800 e 1.500 €   | 800  | 1500 |
| 1500_2500 | Tra 1.500 e 2.500 € | 1500 | 2500 |
| 2500_5000 | Tra 2.500 e 5.000 € | 2500 | 5000 |
| gt_5000   | Più di 5.000 €      | 5000 | null |

**`instalments_monthly`** (Q17, all instalments per month, mortgage included)

| value     | label               | lo   | hi   |
| --------- | ------------------- | ---- | ---- |
| lt_1000   | Meno di 1.000 €     | 0    | 1000 |
| 1000_1500 | Tra 1.000 e 1.500 € | 1000 | 1500 |
| 1500_2500 | Tra 1.500 e 2.500 € | 1500 | 2500 |
| gt_2500   | Più di 2.500 €      | 2500 | null |

**`liquidity`** (Q14, usable at once)

| value         | label                   | lo     | hi     |
| ------------- | ----------------------- | ------ | ------ |
| lt_10000      | Meno di 10.000 €        | 0      | 10000  |
| 10000_50000   | Tra 10.000 e 50.000 €   | 10000  | 50000  |
| 50000_150000  | Tra 50.000 e 150.000 €  | 50000  | 150000 |
| 150000_300000 | Tra 150.000 e 300.000 € | 150000 | 300000 |
| gt_300000     | Più di 300.000 €        | 300000 | null   |

**`saving_monthly`** (Q19)

| value     | label               | lo   | hi   |
| --------- | ------------------- | ---- | ---- |
| lt_100    | Meno di 100 €       | 0    | 100  |
| 100_500   | Tra 100 e 500 €     | 100  | 500  |
| 500_1000  | Tra 500 e 1.000 €   | 500  | 1000 |
| 1000_2000 | Tra 1.000 e 2.000 € | 1000 | 2000 |
| gt_2000   | Oltre 2.000 €       | 2000 | null |

**`pac_monthly`** (Q23)

| value    | label             | lo   | hi   |
| -------- | ----------------- | ---- | ---- |
| lt_100   | Meno di 100 €     | 0    | 100  |
| 100_250  | Tra 100 e 250 €   | 100  | 250  |
| 250_500  | Tra 250 e 500 €   | 250  | 500  |
| 500_1000 | Tra 500 e 1.000 € | 500  | 1000 |
| gt_1000  | Oltre 1.000 €     | 1000 | null |

---

## 3. The 18 schede

Format per field: `id` [type, escapes] "label", then options `value` = label.
`*` marks an `exclusive` option. 40 fields in all (Q11 has two wordings, Q35b is one field);
fewer are shown when conditionals stay hidden.

### Section A: Per cominciare

**S01. Tu e la tua famiglia**
Prompt: "Partiamo da te e dalla tua famiglia."
Help: "Ci serve per leggere tutte le risposte successive nel modo giusto."

- `age_band` [single, escapes: withheld] "Quanti anni hai?" (Q1)
  `18_25` = 18–25 anni · `26_35` = 26–35 anni · `36_45` = 36–45 anni · `46_55` = 46–55 anni · `56_65` = 56–65 anni · `over_65` = Oltre 65 anni
- `marital` [single, escapes: withheld] "Qual è la tua situazione familiare?" (Q2)
  `single` = Single · `married` = Sposato/a · `cohabiting` = Convivente · `separated` = Separato/a · `divorced` = Divorziato/a · `widowed` = Vedovo/a
- `children` [single, escapes: withheld] "Hai figli?" (Q3)
  `no` = No · `one` = Sì, uno · `two` = Sì, due · `three_plus` = Sì, tre o più
- `children_independent` [single, escapes: withheld] "I tuoi figli sono economicamente indipendenti?" (Q4)
  display_when: `S01.children in [one,two,three_plus]`
  `all` = Sì, tutti · `some` = Solo alcuni (shown when `S01.children in [two,three_plus]`) · `none` = No, dipendono ancora economicamente da me

**S02. Casa e immobili**
Prompt: "La casa e gli immobili."
Help: "Conta anche gli immobili posseduti solo in parte."

- `property` [single, escapes: withheld] "Hai immobili di proprietà?" (Q5)
  `main_home` = Sì, la prima casa · `other_only` = Sì, una seconda casa o immobili a reddito · `both` = Sì, sia la prima casa sia altri immobili · `none` = No

**S03. Il lavoro**
Prompt: "Il tuo lavoro e il tuo reddito."
Help: "Non chiediamo ancora cifre. Qui ci interessa solo capire da dove arrivano le entrate."

- `work` [single, escapes: withheld] "Che attività lavorativa svolgi attualmente?" (Q6)
  `employee` = Lavoratore dipendente · `professional` = Libero professionista · `entrepreneur` = Imprenditore / Titolare d'azienda · `self_employed` = Lavoratore autonomo · `retired` = Pensionato · `other` = Altro
- `income_role` [single, escapes: withheld] "Il tuo reddito rappresenta la principale fonte di sostentamento della tua famiglia?" (Q7)
  `sole` = Sì, sono l'unica fonte di reddito · `main` = Sì, rappresenta la fonte principale · `shared` = No, il reddito familiare è distribuito tra più persone · `secondary` = No, il mio reddito è secondario

**— gate —**

**S04. La tua attività**
display_when: `BUSINESS`
Prompt: "Come gestisci il denaro della tua attività"
Help: "Niente cifre e niente conti dell'attività: ci interessa solo come il lavoro in proprio
tocca i soldi di casa."

- `separate_accounts` [single, escapes: withheld] "I soldi dell'attività e quelli personali sono gestiti attraverso conti separati?" (Q8)
  `yes` = Sì, sempre · `partly` = In parte · `no` = No, vengono gestiti insieme
- `tax_reserve` [single, escapes: withheld] "Quando devi pagare tasse e contributi (saldo e acconti), accantoni periodicamente le somme necessarie?" (Q9)
  `regular` = Sì, con regolarità · `irregular` = Sì, ma non sempre con regolarità · `struggle` = No, faccio fatica a pianificare queste uscite
- `owner_dependency` [single, escapes: withheld] "Se non potessi lavorare per qualche mese, cosa succederebbe alla tua attività?" (Q10)
  `continues` = Andrebbe avanti regolarmente anche senza di me · `slows` = Andrebbe avanti, ma con una riduzione delle entrate · `stops` = Si fermerebbe

### Section B: Entrate e uscite

**S05. Le entrate**
Prompt: "Le tue entrate mensili"
Help: "Basta una fascia. Conta quello che arriva già tolte le tasse: stipendi, pensioni, affitti
che ricevi, altre entrate regolari. Se cambia molto, pensa a un mese medio. Se lavori in
proprio, conta quello che porti a casa, non il fatturato dell'attività."

Two wordings of Q11, never shown together; the map reads whichever was answered as `income`.

- `income_self` [band `income_monthly`] "In un mese normale, a quanto ammontano complessivamente le tue entrate nette?"
  display_when: `S01.marital in [single,separated,widowed]`
- `income_household` [band `income_monthly`] "In un mese normale, a quanto ammontano complessivamente le entrate nette della tua famiglia?"
  display_when: `S01.marital in [married,withheld] OR S01.marital missing`
  Note: "Le tue e quelle di chi condivide con te le spese."

**S06. Le spese**
Prompt: "Le spese di tutti i mesi."
Help: "Le spese fisse sono quelle che arrivano comunque: affitto, bollette, spesa, trasporti,
scuola. Le rate di mutui e finanziamenti si contano a parte, più avanti."

- `fixed` [band `fixed_monthly`] "A quanto ammontano mediamente le spese fisse mensili della tua famiglia, escluse le rate di mutui e finanziamenti?" (Q12)
- `tracking` [single, escapes: withheld] "Tieni traccia delle entrate e delle uscite?" (Q13)
  `regular` = Sì, con regolarità · `sometimes` = Ogni tanto · `no` = No, mi regolo a sensazione

### Section C: Imprevisti e rate

**S07. La liquidità**
Prompt: "Liquidità disponibile"
Help: "Conta solo quello che puoi usare da un giorno all'altro, senza vendere nulla e senza
penali, come il conto corrente. Se lavori in proprio, conta solo i soldi personali, non quelli
dell'attività."

- `liquidity` [band `liquidity`] "Quanta liquidità hai attualmente a disposizione, immediatamente utilizzabile?" (Q14)
- `emergency` [single, escapes: withheld] "Se domani dovessi affrontare un imprevisto economico importante, avresti liquidità sufficiente?" (Q15)
  `adequate` = Sì, ho una riserva adeguata · `probably_yes` = Probabilmente sì · `probably_no` = Probabilmente no · `sell_investments` = No, dovrei utilizzare o vendere i miei investimenti · `never_assessed` = Non ho mai valutato questo aspetto

**S08. Gli impegni in corso**
Prompt: "Le rate e i finanziamenti in corso."
Help: "Mutuo, prestiti, fidi: qui contano tutti. Non servono numeri di contratto."

- `debt_types` [multi, escapes: withheld] "Quali di questi impegni finanziari hai attualmente in corso?" (Q16)
  `mortgage` = Mutuo per la casa · `car` = Finanziamento per auto o moto · `personal_loan` = Prestito personale · `salary_loan` = Cessione del quinto · `overdraft` = Fido bancario · `none`* = Nessuno · `other` = Altro
- `instalments` [band `instalments_monthly`] "Complessivamente, quanto paghi di rate ogni mese?" (Q17)
  display_when: `S08.debt_types includes [mortgage,car,personal_loan,salary_loan,overdraft,other]`

### Section D: Risparmi e investimenti

**S09. Il risparmio**
Prompt: "La tua capacità di risparmiare"
Help: "Conta tutto quello che resta da parte ogni mese, dovunque vada: conto, libretto, piani
di accumulo."

- `saving_habit` [single, escapes: withheld] "Riesci a mettere da parte regolarmente una quota del tuo reddito?" (Q18)
  `monthly` = Sì, tutti i mesi · `variable` = Sì, ma in maniera variabile · `occasional` = Solo occasionalmente · `cannot` = No, attualmente non riesco a risparmiare · `no_quota` = Non ho mai definito una quota di risparmio
- `saving_amount` [band `saving_monthly`] "Quanto riesci mediamente ad accantonare ogni mese?" (Q19)
  display_when: `S09.saving_habit in [monthly,variable,occasional,no_quota]`

**S10. Gli investimenti**
Prompt: "Dove sono i tuoi risparmi."
Help: "Ci interessa il tipo di strumento, non il nome del prodotto."

- `investments` [single, escapes: withheld] "Attualmente possiedi investimenti finanziari?" (Q20)
  `yes` = Sì · `mostly_account` = Sì, ma tengo prevalentemente i miei risparmi sul conto corrente · `no` = No
- `holdings` [multi, escapes: withheld] "Quali di questi prodotti o strumenti finanziari e patrimoniali possiedi attualmente?" (Q21)
  Note: "Puoi selezionare più risposte."
  `savings_book` = Libretto di risparmio · `deposit` = Conto deposito · `govt_bonds` = BTP e altri titoli di Stato · `bonds` = Obbligazioni · `shares` = Azioni · `etf` = ETF · `funds` = Fondi comuni di investimento · `pension_fund` = Fondo pensione o PIP · `insurance` = Polizze assicurative finanziarie o di investimento · `property` = Immobili di proprietà · `business_stakes` = Partecipazioni societarie o quote di aziende · `crypto` = Criptovalute e altri strumenti digitali · `other` = Altri strumenti finanziari o patrimoniali · `none`* = Nessuno di questi

**S11. I piani di accumulo**
Prompt: "I piani di accumulo."
Help: "Un piano di accumulo (PAC) è un versamento periodico, di solito mensile, in uno
strumento di investimento."

- `pac` [single, escapes: withheld] "Hai attualmente uno o più piani di accumulo (PAC)?" (Q22)
  `yes` = Sì · `no` = No
- `pac_amount` [band `pac_monthly`] "Quanto versi mediamente al mese?" (Q23)
  display_when: `S11.pac == yes`

**S12. Come gestisci gli investimenti**
display_when: `S10.investments in [yes,mostly_account]`
Prompt: "Quanto conosci i tuoi investimenti."
Help: "Non c'è una risposta giusta. Molte persone non hanno mai avuto queste informazioni in
modo chiaro."

- `chosen_by` [multi, escapes: withheld] "Come hai scelto i tuoi investimenti?" (Q24), note "Puoi selezionare più risposte."
  `self` = Ho scelto autonomamente · `bank` = Mi sono affidato/a alla mia banca · `advisor` = Mi sono affidato/a a un consulente finanziario · `post_office` = Mi sono affidato/a a un consulente di Poste Italiane · `other` = Altro
- `costs_returns` [single, escapes: withheld] "Conosci i costi e i rendimenti dei tuoi investimenti?" (Q25)
  `both` = Sì, conosco entrambi · `costs_only` = Conosco solo i costi · `returns_only` = Conosco solo i rendimenti · `neither` = Non conosco né i costi né i rendimenti
- `last_review` [single, escapes: unknown, withheld] "Da quanto tempo hai sottoscritto o modificato i tuoi investimenti attuali?" (Q26)
  `lt_1` = Meno di 1 anno · `1_3` = Da 1 a 3 anni · `3_5` = Da 3 a 5 anni · `5_10` = Da 5 a 10 anni · `over_10` = Oltre 10 anni

**S13. Lo scopo dei risparmi**
Prompt: "A cosa servono i tuoi risparmi."
Help: "Pensa a tutto quello che hai messo da parte, sul conto e altrove."

- `purpose` [single, escapes: withheld] "I tuoi risparmi hanno uno scopo preciso?" (Q27)
  `yes` = Sì, so esattamente a cosa sono destinati · `vague` = Più o meno, ho degli obiettivi ma non sono ancora definiti · `no` = No, non ho ancora individuato uno scopo preciso

### Section E: Protezione e futuro

**S14. La protezione**
Prompt: "Come proteggi te stesso e la tua famiglia"
Help: "Non chiediamo nulla sulla salute. Ci interessa solo che cosa c'è già."

- `life_cover` [single, escapes: unknown, withheld] "Hai una copertura assicurativa che protegga economicamente te e la tua famiglia in caso di prematura scomparsa o impossibilità di lavorare?" (Q28)
  `tcm` = Sì, una polizza temporanea caso morte (TCM) · `disability` = Sì, una copertura per invalidità o inabilità lavorativa · `both` = Sì, entrambe · `other` = Ho altre coperture assicurative · `none` = No, non ho alcuna tutela

**S15. Pensione e previdenza**
Prompt: "La pensione, vista da oggi."
Help: "Il TFR è la liquidazione: una parte dello stipendio che viene messa da parte ogni mese.
Può restare in azienda o andare a un fondo pensione."

- `pension_fund` [single, escapes: withheld] "Hai già aderito a un fondo pensione?" (Q29)
  display_when: `S03.work != retired`
  `category` = Sì, a un fondo pensione di categoria · `open` = Sì, a un fondo pensione aperto · `pip` = Sì, a un PIP (Piano Individuale Pensionistico) · `no` = No · `unsure_type` = Non so esattamente quale tipologia possiedo
- `tfr` [single, escapes: unknown, withheld] "Dove viene destinato il tuo TFR?" (Q30)
  display_when: `S03.work == employee`
  `company` = Rimane in azienda · `fund` = Viene versato a un fondo pensione
- `children_pension` [single, escapes: unknown, withheld] "Hai verificato se i tuoi figli possiedono una posizione previdenziale o un piano di risparmio?" (Q31)
  display_when: `S01.children in [one,two,three_plus]`
  `fund_only` = Hanno un fondo pensione, ma non un piano di accumulo · `pac_only` = Hanno un piano di accumulo, ma non un fondo pensione · `both` = Hanno entrambi · `neither` = Non hanno né l'uno né l'altro
- `pension_sim` [single, escapes: withheld] "Hai mai fatto una simulazione per capire quale potrebbe essere il tuo reddito pensionistico futuro?" (Q32)
  display_when: `S03.work != retired`
  `knows` = Sì, conosco la mia possibile pensione · `forgot` = Sì, ma non ricordo i risultati · `never` = No, non ho mai fatto una simulazione · `where_start` = Non so da dove iniziare

### Section F: Patrimonio e famiglia

**S16. Patrimonio e successione**
Prompt: "Il futuro del tuo patrimonio e dei tuoi eredi"
Help: "Per patrimonio intendiamo tutto quello che possiedi: casa, altri immobili, risparmi,
investimenti, quote di attività."

- `wealth_estimate` [single, escapes: withheld] "Se oggi decidessi di vendere tutto ciò che possiedi, sapresti stimare il valore complessivo del tuo patrimonio?" (Q33)
  `precise` = Sì, con precisione · `unsure` = Sì, ma non sono completamente sicuro/a · `roughly` = Più o meno · `no` = No
- `heirs` [single, escapes: withheld] "Sapresti indicare chi sono i tuoi eredi?" (Q34)
  `all` = Sì, conosco tutti i miei eredi · `some` = Conosco solo alcuni dei miei possibili eredi · `not_sure` = No, non saprei indicarli con certezza · `never_looked` = Non ho mai approfondito l'argomento
- `succession` [single, escapes: withheld] "Hai mai pensato concretamente a come trasferire il tuo patrimonio ai tuoi eredi in vita?" (Q35)
  `planned` = Sì, ho già pianificato la successione · `thought` = Sì, ci ho pensato ma non ho ancora fatto nulla · `no` = No, non ho mai affrontato l'argomento · `later` = Penso sia un tema da affrontare più avanti
- `succession_reason` [single, escapes: withheld] "Qual è il motivo principale?" (Q35b)
  display_when: `S16.succession in [no,later]`
  `too_small` = Ritengo di avere un patrimonio ancora troppo basso · `future` = Penso sia un argomento da affrontare in futuro (shown when `S16.succession == no`) · `unaware` = Non conosco le possibilità di pianificazione successoria · `by_law` = Penso che la successione venga gestita automaticamente dalla legge · `not_priority` = Non ritengo sia una mia priorità · `other` = Altro

### Section G: Obiettivi e domande

**S17. Gli obiettivi**
Prompt: "Obiettivi e progetti futuri"
Help: "Servono a leggere tutto il resto: i soldi hanno senso rispetto a quello che vuoi farci."

- `goals` [multi, escapes: withheld] "Quali sono i tuoi principali obiettivi finanziari per il tuo futuro?" (Q36)
  Note: "Puoi selezionare più risposte."
  `buy_home` = Acquistare una casa · `mortgage` = Estinguere o ridurre un mutuo · `capital` = Accumulare un capitale · `grow_wealth` = Aumentare il patrimonio · `extra_income` = Costruire una rendita integrativa · `retirement` = Prepararmi alla pensione · `children` = Garantire un futuro economico ai miei figli (shown when `S01.children in [one,two,three_plus]`) · `protect` = Proteggere il patrimonio familiare · `handover` = Pianificare il passaggio generazionale · `freedom` = Avere maggiore libertà finanziaria · `other` = Altro

**S18. Le tue domande**
Prompt: "Due domande aperte."
Help: "Sono facoltative. Non scrivere nomi di altre persone, numeri di conto o informazioni
sulla salute."

- `improve` [textarea, max 300] "Se potessi migliorare un solo aspetto della tua attuale situazione finanziaria, quale sceglieresti?" (Q37)
- `question` [textarea, max 300] "C'è una domanda che vorresti fare o un argomento che vorresti approfondire?" (Q38)

---

## 4. Computed facts

The map's value is in what it computes, not in what it repeats. Everything below is interval
arithmetic on the bands: never a single invented number. `I` income (`income_self` or
`income_household`), `E` fixed spending, `R` instalments, `A` liquidity, `S` monthly saving,
`P` PAC contributions (all from the band tables).

`R` is `[0, 0]` when `debt_types == [none]`; it is not known when there are debts and
`instalments` is not a known band.

| id                              | formula                                                                                           | used for                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `outgoings`                     | `E + R`, euros per month                                                                          | fixed spending and instalments together                 |
| `margin`                        | `I − (E + R)` → `[I.lo − O.hi, I.hi − O.lo]`, euros per month, read as below                      | what is left, or missing, at month end                  |
| `marginYear`                    | `margin × 12`                                                                                     | the monthly margin in a year                            |
| `coverMonths`                   | `A / (E + R)`, months                                                                             | how long the liquidity lasts                            |
| `shockAmount`                   | 10000 when `I.lo >= 10000`, 5000 when `I.lo >= 2500`, otherwise 2000 (also when `I` is not known) | a reference unexpected expense (Q15 names no amount)    |
| `shockWeeks`                    | `shockAmount / I × 52 / 12`, weeks                                                                | that expense, in weeks of income                        |
| `shockShare`                    | `shockAmount / A`, percent                                                                        | the same expense, as a share of the liquidity           |
| `instalmentsYear`               | `R × 12`, euros                                                                                   | instalments in a year                                   |
| `instalmentShare`               | `R / I`, percent                                                                                  | weight of instalments                                   |
| `threeMonths`                   | `(E + R) × 3`, euros                                                                              | three months of fixed spending and instalments          |
| `missingThree`                  | `3(E + R) − A`, euros                                                                             | what the liquidity does not cover of those three months |
| `savingYear`                    | `S × 12`, euros                                                                                   | monthly saving in a year                                |
| `savingShare`                   | `S / I`, percent                                                                                  | monthly saving as a share of income                     |
| `pacShare`                      | `P / S`, percent                                                                                  | part of the monthly saving going into PACs              |
| `pacYear`                       | `P × 12`, euros                                                                                   | PAC contributions in a year                             |
| `children`                      | `no` 0, `one` 1, `two` 2, `three_plus` 3 (printed "tre o più")                                    |                                                         |
| `dependentChildren`             | `children_independent` in [some, none]                                                            | some child still depends on the respondent              |
| `debtCount`                     | number of `debt_types` other than `none`                                                          |                                                         |
| `holdingsCount`                 | number of `holdings` other than `none`, `property`, `business_stakes`, `other`                    | financial forms of savings                              |
| `pensionKnown` / `pensionTotal` | how many pension elements are known (see PE-01)                                                   |                                                         |

Two answers narrow or widen `margin`:

- **Salary loan** (`debt_types` includes `salary_loan`): the stated income may already be net of
  it, so its instalment may be counted twice. The best case leaves all instalments out:
  `margin.hi = I.hi − E.lo`.
- **Saving every month** (`saving_habit == monthly`, `S` known): whoever saves every month has at
  least that saving left, so `margin.lo = max(margin.lo, S.lo)`. Not when `S.lo > margin.hi`
  (the figures contradict each other: the plain margin stays, and IO-08 says so).

A value is **not computable** when an input is `unknown`, `withheld` or missing, or when the
result is open at both ends. A sentence whose template needs a non-computable value is not
printed.

**Wording.** As in the second version: euros (`*_eur`), months (`*_months`), weeks
(`shock_weeks`), shares (`*_share`), with the same rounding and phrasing rules. Years and
people phrases are no longer used. New phrases:

- Children (`children_phrase`): 1 → "un figlio", 2 → "due figli", 3 → "tre o più figli".
- Dependent children (`dependent_children_phrase`): `children_independent == some` →
  "Alcuni figli dipendono ancora economicamente da te"; `none` with one child → "Un figlio
  dipende ancora economicamente da te"; `none` otherwise → "I figli dipendono ancora
  economicamente da te".
- Counts below ten are always written in letters ("due", "tre"), never digits.

---

## 5. Areas and clarity

| id  | Title                                | Schede that feed it                                                                                       |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| IO  | Entrate e uscite                     | S05, S06, S04 (`separate_accounts`)                                                                       |
| RI  | Riserva per gli imprevisti           | S07, S04 (`tax_reserve`)                                                                                  |
| DE  | Debiti e rate                        | S08                                                                                                       |
| SA  | Risparmi, investimenti e patrimonio  | S09, S10, S11, S12, S13, S16 (`wealth_estimate`)                                                          |
| PR  | Protezione e passaggio generazionale | S14, S16 (`heirs`, `succession`, `succession_reason`), S15 (`children_pension`), S04 (`owner_dependency`) |
| PE  | Pensione e TFR                       | S15 (`pension_fund`, `tfr`, `pension_sim`)                                                                |

S01-S03 sit at the centre ("Voi"), S17 in the goals, S18 nowhere.

Each area has **clarity signals**. A signal is `clear`, `unclear` or `absent`
(`withheld`, missing or not applicable are all `absent`).

| Area | Signal            | clear when                            | unclear when                            |
| ---- | ----------------- | ------------------------------------- | --------------------------------------- |
| IO   | income            | known band                            | `unknown`                               |
| IO   | fixed             | known band                            | `unknown`                               |
| IO   | tracking          | `regular`                             | `sometimes`, `no`                       |
| IO   | separate_accounts | `yes`                                 | `partly`, `no`                          |
| RI   | liquidity         | known band                            | `unknown`                               |
| RI   | emergency         | any option except `never_assessed`    | `never_assessed`                        |
| RI   | tax_reserve       | any option                            | (never)                                 |
| DE   | debt_types        | any option                            | (never)                                 |
| DE   | instalments       | known band, or `debt_types == [none]` | `unknown`                               |
| SA   | saving_amount     | known band                            | `unknown`                               |
| SA   | holdings          | any option                            | (never)                                 |
| SA   | costs_returns     | `both`                                | `costs_only`, `returns_only`, `neither` |
| SA   | last_review       | any option                            | `unknown`                               |
| SA   | purpose           | `yes`                                 | `vague`, `no`                           |
| SA   | wealth_estimate   | `precise`, `unsure`                   | `roughly`, `no`                         |
| PR   | life_cover        | any option                            | `unknown`                               |
| PR   | owner_dependency  | any option                            | (never)                                 |
| PR   | heirs             | `all`                                 | `some`, `not_sure`, `never_looked`      |
| PR   | children_pension  | any option                            | `unknown`                               |
| PE   | tfr               | `company`, `fund`                     | `unknown`                               |
| PE   | pension_fund      | `category`, `open`, `pip`, `no`       | `unsure_type`                           |
| PE   | pension_sim       | `knows`                               | `forgot`, `never`, `where_start`        |

State:

- `non_compilata` ("Non compilata"): no field of the area (the table above) has an answer,
  escapes included. Such an area prints no sentence, not even one computed from other schede.
  For PE with `work == retired` the area prints "Sei già in pensione: questa parte non ti
  riguarda." instead of a state.
- With answers but every signal `absent` (Q18 "cannot" alone, say), the state is `in_parte`.
- `chiara` ("Quadro completo"): no `unclear` signal.
- `da_ricostruire` ("Quadro da ricostruire"): at least half of the non-absent signals are `unclear`.
- `in_parte` ("Quadro parziale"): otherwise.

The state says how complete the picture is, never how good the situation is. Unknowns are
not listed: they appear only as what they prevent the map from computing (tier 4 sentences).
If any signal of the area is `withheld`, the paragraph ends with: "Alcune risposte non sono
state indicate."

---

## 6. Sentences

### Writing rule

**No sentence may only restate an answer.** Every sentence must do at least one of:

1. state a computed fact (section 4);
2. join two or more answers into a consequence the person has not drawn;
3. say what a missing datum prevents the map from computing.

So: no "Hai indicato che…", no "Non sai…", no list of the questions answered "non lo so".
An answer may appear inside a sentence only as the premise of one of the three things above.
A test enforces the first part: no template may contain "hai indicato", "hai detto",
"hai risposto" or "hai scelto".

Voice: plain, about the household ("voi"), present tense, short sentences. Short label
"spese fisse" for Q12, "spese fisse e rate" for `outgoings`.

### How an area is written

Each area prints one short paragraph, built from the sentences below:

1. its **F** sentences (computed facts), in document order;
2. then up to **three** tiered sentences that fire, ordered by tier, then document order.

Tiers: 1 declared difficulty · 2 people and protection · 3 goals against habits, timing or
resources · 4 what a missing datum prevents · 5 other readings. **F** sentences are never
highlighted. Lenses: `chiarezza`, `coerenza`, `strategia`, `protezione`, `trasmissione`; the
lenses of the printed sentences appear as small tags next to the area title.

A sentence fires only when every fact it reads is known, unless its condition names an escape
state. Where a rule lists variants, the first whose condition holds is used.

Rule ids are stable: a rule kept from the second version keeps its id, a dropped id is never
reused, new rules take the next free number of their area.

### IO, Entrate e uscite

**IO-01** · F · chiarezza · needs `margin`

- `margin.lo >= 0`: "Pagate le spese fisse e le rate, ogni mese restano {margin_eur} per tutto
  il resto: spese libere, imprevisti e risparmio insieme."
- `margin.hi < 0`: "Spese fisse e rate superano le entrate: ogni mese mancano {gap_eur}."
- `margin.hi == 0`: "Spese fisse e rate assorbono tutte le entrate: a fine mese non resta
  nulla, o mancano {gap_eur}."
- otherwise: "Entrate, spese fisse e rate sono vicine: con le fasce scelte, a fine mese possono
  restare fino a {margin_hi} euro oppure mancarne fino a {gap_hi}."
- Never imply: a right or wrong level of spending.

**IO-02** · tier 1 · chiarezza · `margin.hi <= 0`

- `tracking != regular`: "Ogni mese spese fisse e rate assorbono tutte le entrate, o le
  superano, e oggi entrate e
  uscite non vengono seguite con regolarità: da dove arrivi la differenza, la mappa non lo
  vede."
- otherwise: "Ogni mese spese fisse e rate assorbono tutte le entrate, o le superano: la
  differenza viene coperta
  con risparmi, aiuti o credito, e con quale dei tre la mappa non lo vede."
- Question: "Da dove si può partire per rimettere in pari entrate e uscite?"
- Never imply: that investments or products can recover the gap.

**IO-03** · tier 3 · coerenza · `margin.lo > 0` AND `saving_habit` in [cannot, no_quota]

- `cannot`: "Sulla carta, pagate spese fisse e rate, restano {margin_eur} al mese, eppure oggi
  non si riesce a mettere nulla da parte: in un anno sono {margin_year_eur} di cui la mappa non
  vede la destinazione."
- `no_quota`: "Pagate spese fisse e rate, restano {margin_eur} al mese, e una quota da mettere
  da parte non è mai stata fissata: in un anno sono {margin_year_eur} senza una destinazione
  stabilita."
- Question: "Dove finisce quello che resta a fine mese?"
- Never imply: how much should be saved.

**IO-04** · tier 5 · strategia · `income_role == sole` AND `marital` in [married, cohabiting] AND `E` known

- "In una famiglia di due adulti il tuo reddito è l'unica entrata: le spese fisse, {fixed_eur}
  al mese, poggiano tutte su di te."
- Question: "Come si organizza la casa se la mia entrata cambia?"
- Never imply: forecasts about work or income, or that the partner should work.

**IO-05** · tier 4 · chiarezza · `income` is `unknown` OR `fixed` is `unknown`

- "Manca {missing_io}: senza, la mappa non può calcolare quanto resta a fine mese né quanto
  pesano rate e risparmio. È il numero da cui dipende quasi tutto il resto."
- `missing_io`: income → "la cifra delle entrate"; fixed → "la cifra delle spese fisse";
  both → "la cifra delle entrate e quella delle spese fisse".
- Question: "Come ricostruisco quanto entra e quanto esce davvero in un mese?"
- Never imply: a judgement on the person.

**IO-06** · tier 6 (firm point, never highlighted) · chiarezza · `tracking == regular` AND `saving_habit == monthly` AND `margin.lo > 0`

- "Entrate, spese e risparmio sono seguiti con regolarità: di quello che resta ogni mese si sa
  già dove va."

**IO-07** · tier 4 · chiarezza · `separate_accounts` in [partly, no] AND (`I` known OR `E` known)

- "I soldi dell'attività e quelli personali stanno, almeno in parte, sugli stessi conti: le
  cifre di entrate e spese fisse possono mescolare le due cose, e con loro quello che la mappa
  calcola a fine mese."
- Question: "Quanto di quello che entra e che esce riguarda la casa, e quanto l'attività?"
- Never imply: that the accounts should be separated.

**IO-08** · tier 4 · chiarezza · `S.lo > margin.hi` (both known) (NEW)

- "Ogni mese si mettono da parte almeno {saving_lo} euro, più di quanto resta sulla carta dopo
  spese fisse e rate: una delle cifre di entrate, spese o risparmio non torna, e con lei i
  calcoli della mappa."
- Question: "Quanto entra, quanto esce e quanto resta, davvero, in un mese?"
- Never imply: that the person is wrong.

### RI, Riserva per gli imprevisti

**RI-01** · F · chiarezza · needs `coverMonths`

- "I soldi disponibili subito coprono {cover_months} di spese fisse e rate."
- Never imply: that the reserve is enough or not enough.

**RI-02** · F · chiarezza · needs `shockWeeks`

- `A` not known: "Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate."
- `A.hi < shockAmount`: "Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di
  entrate, ed è più di tutto quello che c'è da parte."
- otherwise: "Una spesa imprevista di {shock_amount} euro vale {shock_weeks} di entrate, e
  {shock_share} di quello che è disponibile subito."

**RI-03** · tier 2 · protezione · `dependentChildren` AND `emergency` in [probably_no, sell_investments]

- `probably_no`: "{dependent_children_phrase}, e per un imprevisto importante la liquidità
  probabilmente non basterebbe: ricadrebbe sulle spese di tutti i giorni."
- `sell_investments`: "{dependent_children_phrase}, e per un imprevisto importante servirebbe
  usare o vendere gli investimenti: la liquidità da sola non basterebbe."
- Question: "Che cosa succede in casa se arriva una spesa importante e imprevista?"
- Never imply: how many months would be right.

**RI-04** · tier 3 · coerenza · (rewritten)

- `emergency` in [probably_no, sell_investments] AND `coverMonths.lo >= 6`: "La
  liquidità copre almeno sei mesi di spese fisse e rate, eppure per un imprevisto importante
  non sembra bastare: o è già destinata ad altro, o l'imprevisto che si ha in mente è più
  grande. Quale dei due, la mappa non lo vede."
- `emergency` in [adequate, probably_yes] AND `coverMonths.hi < 3`: "La liquidità è
  considerata sufficiente per un imprevisto importante; in spese fisse e rate vale
  {cover_months}."
- Question: "Per quale imprevisto basta, davvero, la liquidità che ho?"
- Never imply: that the money should be used or moved.

**RI-05** · tier 3 · coerenza · `emergency == probably_no` AND no regular saving AND `outgoings` known

No regular saving: `saving_habit == cannot`, or `no_quota` unless `S.lo > 0` (Q19 is asked after
`no_quota` too). SA-02 reads the same.

- "Per un imprevisto importante la liquidità probabilmente non basterebbe, e oggi non si mette
  da parte nulla con regolarità: un mese di spese fisse e rate vale {outgoings_eur}."
- Question: "Su che cosa potrei contare per un imprevisto importante?"
- Never imply: amounts or percentages to save.

**RI-06** · tier 5 · strategia · `coverMonths.lo >= 12` AND `investments == mostly_account` AND `purpose` in [vague, no]

- "Sul conto c'è più di un anno di spese fisse e rate, e i risparmi stanno soprattutto lì:
  oltre a quello che serve per gli imprevisti, il resto non ha ancora uno scopo preciso."
- Question: "A cosa servono, e quando, i soldi che ho sul conto?"
- Never imply: that they should be invested.

**RI-07** · tier 4 · chiarezza

- `liquidity` is `unknown`: "Non è nota la cifra disponibile subito: la mappa non può dire per
  quanto tempo reggerebbero spese fisse e rate."
- `A` known AND `fixed` is `unknown`: "Da parte ci sono {liquidity_eur}; senza la cifra delle
  spese fisse non si possono tradurre in mesi."
- Question: "Quanti soldi potrei usare davvero da un giorno all'altro?"

**RI-08** · tier 3 · coerenza · `tax_reserve` in [irregular, struggle]

- `coverMonths` computable: "{tax_phrase}: alle scadenze di saldo e acconti i soldi arrivano
  dalla stessa liquidità che serve per gli imprevisti, e quella davvero libera è meno di quanto
  appare." (No months here: RI-01 already prints them in the same paragraph.)
- otherwise: "{tax_phrase}: alle scadenze di saldo e acconti i soldi devono arrivare dalla
  liquidità o dalle entrate di quei mesi."
- `tax_phrase`: irregular → "Per tasse e contributi i soldi si mettono da parte, ma non con
  regolarità"; struggle → "Per tasse e contributi è difficile mettere da parte i soldi in
  anticipo".
- Question: "Quanto pesano, e quando arrivano, le mie scadenze di tasse e contributi?"
- Never imply: amounts or percentages to set aside, or how to organise the accounts.

### DE, Debiti e rate

**DE-01** · F · chiarezza

- `debt_types == [none]`: "Nessuna rata in corso: tutte le entrate sono libere da impegni
  presi in passato."
- `R` and `I` known, `instalmentShare.lo >= 100`: "{debt_count_phrase} {instalments_year_eur}
  l'anno: tutte le entrate indicate, o più."
- `instalmentShare` computable: "{debt_count_phrase} {instalments_year_eur} l'anno:
  {instalment_share} di quello che entra."
- `R` known: "{debt_count_phrase} {instalments_year_eur} l'anno."
- `debt_count_phrase`: 1 → "Un impegno a rate che vale"; n → "{n} impegni a rate che insieme
  valgono" (number in letters).
- Never imply: a sustainability threshold.

**DE-06** · tier 3 · coerenza · `debt_types` includes [personal_loan, overdraft] AND `saving_habit` in [monthly, variable]

- "Nello stesso periodo una parte dei soldi viene messa da parte e un'altra paga un prestito o
  un fido: sono due movimenti opposti, e quale dei due pesi di più dipende da costi che la
  mappa non ha."
- Question: "Come stanno insieme quello che metto da parte e quello che pago per prestiti e
  fidi?"
- Never imply: paying off debts with savings.

**DE-07** · tier 2 · protezione · `debt_types` includes mortgage AND `income_role` in [sole, main] AND `life_cover` in [none, other]

- `sole`: "Il mutuo poggia sul tuo reddito, l'unico della famiglia, e non c'è una copertura per
  scomparsa o impossibilità di lavorare: se quell'entrata si ferma, la rata resta."
- `main`: "Il mutuo poggia soprattutto sul tuo reddito, e non c'è una copertura per scomparsa o
  impossibilità di lavorare: se quell'entrata si ferma, la rata resta."
- Question: "Che cosa succede al mutuo se la mia entrata si ferma?"
- Never imply: that a policy is needed.

**DE-08** · tier 4 · chiarezza · `debtCount >= 1` AND `instalments` is `unknown`

- "Non è nota la cifra totale delle rate: la mappa non può dire quanto pesano sulle entrate,
  né quanto resta a fine mese."
- Question: "Quanto pago di rate, in tutto, ogni mese?"

**DE-12** · tier 4 · chiarezza · `debt_types` includes [salary_loan, overdraft] (NEW)

- includes `salary_loan`: "La cessione del quinto si trattiene dallo stipendio o dalla
  pensione: se le entrate indicate ne sono già al netto, quella rata compare due volte. Per
  questo la mappa calcola il fine mese in tutti e due i modi." (See `margin`, section 4.)
- otherwise (`overdraft`): "Un fido non ha una rata fissa: quanto pesa ogni mese dipende da
  quanto viene usato, e la cifra delle rate può comprenderlo oppure no."
- Question: "Quanto pesano davvero, ogni mese, cessione del quinto e fido?"
- Never imply: that the credit is expensive or should be closed.

### SA, Risparmi, investimenti e patrimonio

**SA-01** · F · chiarezza · (rewritten)

- `saving_habit == cannot`: "Oggi non si riesce a mettere nulla da parte: tutto quello che
  entra serve al mese in corso."
- `S` known, `savingShare` computable: "Ogni mese si mettono da parte {saving_eur}:
  {saving_share} di quello che entra, {saving_year_eur} in un anno."
- `S` known: "Ogni mese si mettono da parte {saving_eur}: {saving_year_eur} in un anno."

**SA-02** · tier 3 · coerenza · `goals` includes [capital, grow_wealth, extra_income, freedom] AND no regular saving (as in RI-05)

- "{goal_name_cap} è tra le cose che contano per voi, e oggi non c'è una quota del reddito
  messa da parte con regolarità: tra l'obiettivo e le abitudini di ogni mese manca ancora il
  collegamento."
- `goal_name_cap`: the first of the listed goals that was chosen, by its short name (section 7)
  with a capital first letter.
- Question: "Da quale cifra, anche piccola, si può cominciare?"
- Never imply: amounts or percentages to save.

**SA-03** · tier 3 · coerenza · `purpose == no` AND `goals` known AND there are savings (rewritten)

There are savings unless `saving_habit == cannot` AND `investments == no`. `purpose == vague`
goes to SA-15, a weaker reading.

- one goal (only `other` counts as one): "C'è una cosa per cui volete avere dei soldi, e i
  risparmi non hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un
  collegamento."
- more: "Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e i risparmi non
  hanno ancora uno scopo preciso: tra le due cose, per ora, non c'è un collegamento."
- `goals_count_phrase`: the number of goals other than `other`, in letters ("due", "tre", …).
- Question: "Quali dei miei risparmi servono a quale obiettivo?"
- Never imply: how to split the savings.

**SA-05** · tier 4 · chiarezza · `costs_returns` in [costs_only, returns_only, neither] (rewritten)

- `neither`: "Degli investimenti non si conoscono né i costi né i rendimenti: la mappa non può
  dire che cosa producono, né quanto trattengono ogni anno."
- `returns_only`: "Degli investimenti si conosce il rendimento ma non il costo: senza il
  secondo, il primo non dice quanto resta davvero."
- `costs_only`: "Degli investimenti si conosce il costo ma non il rendimento: non si può
  ancora dire che cosa resta, tolti i costi."
- Question: "Quanto mi costano e quanto rendono, davvero, gli investimenti che ho?"
- Never imply: that the costs are high or that anything should be changed.

**SA-07** · tier 5 · strategia · `chosen_by` includes any of [bank, post_office] AND `purpose` in [vague, no]

- "Gli investimenti di oggi sono stati scelti affidandosi alla banca o alle Poste, e i
  risparmi non hanno ancora uno scopo preciso: manca il termine con cui confrontare quella
  scelta."
- Question: "Per quale motivo i miei risparmi sono dove sono oggi?"
- Never imply: criticism of the bank or the post office.

**SA-08** · tier 5 · chiarezza · `holdingsCount >= 4` (rewritten, no knowledge check)

- "I risparmi sono in {holdings_count} forme diverse; quanto siano davvero diverse tra loro,
  e quanto costino insieme, dipende da cosa c'è dentro ciascuna."
- Question: "Che cosa c'è dentro i prodotti che ho?"
- Never imply: that risk is high or badly spread.

**SA-09** · tier 5 · strategia · `property` in [other_only, both] OR `holdings` includes business_stakes OR `work == entrepreneur`

- "Una parte di ciò che avete è in immobili o in un'attività: è ricchezza che non diventa
  denaro in poco tempo."
- Question: "Su quali risorse posso contare in tempi brevi, e su quali no?"
- Never imply: selling property or shares.

**SA-12** · F · chiarezza · `pac == yes` AND `P` known (NEW)

- `pacShare` computable and `pacShare.hi <= 100`: "Di quello che si mette da parte ogni mese,
  {pac_share} va in piani di accumulo."
- otherwise: "Nei piani di accumulo vanno {pac_eur} al mese: {pac_year_eur} in un anno."

**SA-13** · tier 5 · strategia · `last_review` in [5_10, over_10] or `unknown` (NEW)

- known: "Gli investimenti di oggi sono stati scelti o modificati {review_phrase}: da allora
  possono essere cambiati i prodotti, i costi e le cose per cui servono i soldi."
- `unknown`: "Non è noto quando gli investimenti di oggi siano stati scelti o modificati
  l'ultima volta: non si può dire se rispecchino ancora le cose per cui servono i soldi."
- `review_phrase`: 5_10 → "tra cinque e dieci anni fa"; over_10 → "più di dieci anni fa".
- Question: "Che cosa è cambiato da quando ho scelto i miei investimenti?"
- Never imply: that they should be reviewed or changed.

**SA-14** · tier 4 · chiarezza · (`wealth_estimate == no` AND at least one asset kind) OR (`wealth_estimate == roughly` AND at least two)

Asset kinds as in PR-13: the home, other property, investments, the business. With one kind
"more or less" is enough: its value is the total.

- "Il valore complessivo di ciò che avete non è noto con sicurezza: senza un totale, non si
  può dire quale parte sia disponibile subito, quale investita e quale in immobili o
  attività."
- Question: "Quanto vale, in tutto, quello che possiedo?"

**SA-15** · tier 5 · coerenza · `purpose == vague` AND `goals` known AND there are savings (as in SA-03) (NEW)

- one goal: "C'è una cosa per cui volete avere dei soldi, e gli obiettivi dei risparmi ci sono
  ma non sono ancora definiti: non è chiaro quanta parte serva a quella cosa, né per quando."
- more: "Le cose per cui volete avere dei soldi sono {goals_count_phrase}, e gli obiettivi dei
  risparmi ci sono ma non sono ancora definiti: non è chiaro quale parte serva a quale, né per
  quando."
- Question: "Quale parte dei miei risparmi serve a quale obiettivo, e per quando?"
- Never imply: how to split the savings, or amounts and timing.

### PR, Protezione e passaggio generazionale

**PR-01** · F · protezione · needs `threeMonths`

- `missingThree.lo > 0`: "Tre mesi di spese fisse e rate valgono {three_months_eur}; da
  parte, subito disponibili, ci sono {liquidity_eur}: ne mancherebbero {missing_three_eur}."
- `A.lo >= threeMonths.hi`: "Tre mesi di spese fisse e rate valgono {three_months_eur}: la
  liquidità li copre per intero."
- `A` known: "Tre mesi di spese fisse e rate valgono {three_months_eur}: la liquidità può
  bastare oppure no, a seconda di dove cadono le cifre dentro le fasce scelte."
- otherwise: "Tre mesi di spese fisse e rate valgono {three_months_eur}."
- Never imply: how many months should be covered.

**PR-02** · tier 2 · protezione · `income_role` in [sole, main] AND `dependentChildren` AND `life_cover` in [none, other] (rewritten)

- `sole`: "Il tuo reddito è l'unica entrata di una famiglia con {children_phrase}, e non c'è
  una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma, si ferma
  tutto insieme."
- `main`: "Il tuo reddito è la fonte principale di una famiglia con {children_phrase}, e non
  c'è una copertura per scomparsa o impossibilità di lavorare: se quell'entrata si ferma,
  resta solo quello che portano gli altri."
- Question: "Che cosa succederebbe in casa se la mia entrata si fermasse?"
- Never imply: that a policy is needed.

**PR-03** · tier 2 · protezione · `life_cover == none` AND `dependentChildren` AND PR-02 does not fire

- "{dependent_children_phrase}, e non c'è nessuna tutela per scomparsa o impossibilità di
  lavorare: quello che verrebbe a mancare ricadrebbe sulle entrate e sui risparmi della
  famiglia."
- Question: "Quali imprevisti peserebbero di più sulla mia famiglia?"
- Never imply: that a policy is needed.

**PR-06** · tier 5 · protezione · `BUSINESS` AND `life_cover` in [none, tcm, other]

- "Con un lavoro in proprio l'entrata dipende dal poter lavorare, e tra le coperture che hai
  nessuna riguarda l'invalidità o l'inabilità al lavoro."
- Question: "Che cosa succede alle mie entrate se non posso lavorare per un periodo?"
- Never imply: that the person should take out insurance.

**PR-07** · tier 5 · trasmissione · `goals` includes protect AND `assets_list` not empty

- one asset: "Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro
  caso riguarda {assets_list}."
- more: "Proteggere il patrimonio familiare è tra le cose che contano per voi: nel vostro caso
  riguarda insieme {assets_list}."
- `assets_list`, joined with commas and a final "e": "la casa" (`property` in [main_home,
  both]), "gli altri immobili" (`property` in [other_only, both]), "gli investimenti"
  (`investments` in [yes, mostly_account]), "l'attività" (`holdings` includes business_stakes
  OR `work == entrepreneur`), "le coperture" (`life_cover` in [tcm, disability, both, other]).
- Question: "Che cosa devo sapere per proteggere quello che ho?"
- Never imply: succession or legal solutions.

**PR-08** · tier 4 · chiarezza · `life_cover` is `unknown`

- "Non è noto se ci siano coperture per scomparsa o impossibilità di lavorare: la mappa non
  può dire che cosa resterebbe a carico della famiglia se la tua entrata si fermasse."
- Question: "Quali coperture ho già, anche attraverso il lavoro o il mutuo?"

**PR-09** · tier 2 · protezione · `owner_dependency` in [slows, stops] AND `coverMonths` computable

- "Se tu non potessi lavorare per qualche mese, l'attività {dependency_phrase}: nel frattempo
  spese fisse e rate conterebbero sulla liquidità, che ne copre {cover_months}."
- `dependency_phrase`: slows → "andrebbe avanti, ma con meno entrate"; stops → "si fermerebbe,
  e con lei la tua entrata".
- Question: "Che cosa succede all'attività, e alle entrate di casa, se mi fermo per un periodo?"
- Never imply: insurance, a key-person cover or how many months would be right.

**PR-10** · tier 3 · trasmissione · `goals` includes handover AND `owner_dependency == stops`

- "Pianificare il passaggio generazionale è tra le cose che contano per voi, e oggi l'attività
  si ferma se ti fermi tu: quello che si passerebbe dipende ancora da una sola persona."
- Question: "Che cosa vuol dire, per la mia attività, prepararne il passaggio?"
- Never imply: timing, legal or corporate solutions, or the value of the business.

**PR-11** · tier 3 · coerenza · `goals` includes handover AND `succession` in [thought, no, later]

Protecting the family's wealth (`protect`) is not passing it on: PR-07 reads it.

- `thought`: "{goal_name_cap} è tra le cose che contano per voi; a come trasferire il
  patrimonio agli eredi si è pensato, ma non è ancora stato fatto nulla."
- otherwise: "{goal_name_cap} è tra le cose che contano per voi, e come trasferire il
  patrimonio agli eredi non è ancora stato affrontato."
- `goal_name_cap`: handover.
- Question: "Che cosa succederebbe oggi a quello che ho, se dovesse passare ad altri?"
- Never imply: legal instruments, wills, donations or timing.

**PR-12** · tier 4 · trasmissione · `succession_reason` in [by_law, too_small] (NEW)

- `by_law`: "La successione è vista come qualcosa che la legge regola da sé: in assenza di
  scelte, la legge stabilisce chi riceve e in quali parti, e il risultato è quello, non uno
  deciso."
- `too_small` AND `wealth_estimate` in [roughly, no] AND at least one asset kind (as in
  SA-14): "Il patrimonio è considerato troppo
  piccolo per pensare alla successione, ma il suo valore complessivo non è noto con
  sicurezza."
- Question: "Che cosa succede oggi a quello che ho, se non decido nulla?"
- Never imply: that a will or other instrument is needed.

**PR-13** · tier 4 · trasmissione · `heirs` in [not_sure, never_looked] AND `assets_list` not empty (NEW)

- "Non è chiaro chi siano gli eredi: è il primo dato da cui dipende qualsiasi passaggio del
  patrimonio, e senza, la mappa non può dire a chi andrebbero {assets_list}."
- `assets_list` as in PR-07, without "le coperture"; the verb agrees ("andrebbe" with a single
  asset).
- Question: "Chi sono, oggi, i miei eredi?"
- Never imply: legal advice.

**PR-14** · tier 5 · trasmissione · `children_pension == neither` AND `goals` includes children (NEW)

- "Garantire un futuro economico ai figli è tra le cose che contano per voi, e oggi a nome dei
  figli non c'è né un fondo pensione né un piano di accumulo."
- Question: "Che cosa c'è già, oggi, a nome dei miei figli?"
- Never imply: that they should open one.

### PE, Pensione e TFR

Pension elements: where the TFR goes (`tfr` known; employees only), whether there is a pension
fund and of which kind (`pension_fund` known and not `unsure_type`), a known simulation
(`pension_sim == knows`). `pensionTotal` is 3 for employees, 2 otherwise.

**PE-01** · F · chiarezza · at least one pension field answered

- `pensionKnown == pensionTotal`: "Gli elementi che descrivono la pensione futura sono
  {pension_total_phrase}, e sono tutti noti."
- `pensionKnown == 0`: "Degli elementi che descrivono la pensione futura ({pension_elements})
  non ne è noto nessuno: finché mancano, la mappa non può dire nulla su quanto entrerà in casa
  dopo il lavoro."
- otherwise: "Degli elementi che descrivono la pensione futura ({pension_elements})
  {pension_known_phrase}: finché mancano gli altri, la mappa non può dire nulla su quanto
  entrerà in casa dopo il lavoro."
- `pension_elements`: employees → "dove va il TFR, se c'è un fondo e di che tipo, una
  simulazione della pensione"; others → "se c'è un fondo e di che tipo, una simulazione della
  pensione".
- `pension_known_phrase`: 1 → "ne è noto uno"; 2 → "ne sono noti due". `pension_total_phrase`:
  "due" or "tre".

**PE-02** · tier 3 · coerenza · `goals` includes [retirement, extra_income] AND `pension_sim` in [forgot, never, where_start]

- `forgot`: "{goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un
  numero di partenza: una simulazione della pensione è stata fatta, ma il risultato non è
  rimasto."
- otherwise: "{goal_name_cap} è tra le cose che contano per voi, ed è un obiettivo senza un
  numero di partenza: una simulazione della pensione non è mai stata fatta."
- `goal_name_cap`: retirement if chosen, else extra_income.
- Question: "Dove trovo una simulazione della mia pensione, e come si legge?"
- Never imply: amounts or retirement ages.

**PE-03** · tier 4 · chiarezza · `age_band` in [46_55, 56_65] AND `pension_sim` in [forgot, never, where_start]

- "{age_phrase_cap} la pensione è l'entrata dei prossimi anni, e oggi non ha ancora una
  cifra."
- `age_phrase_cap`: 46_55 → "Tra i 46 e i 55 anni"; 56_65 → "Tra i 56 e i 65 anni".
- Question: "Che cosa posso già sapere oggi sulla mia pensione?"
- Never imply: that it is late.

**PE-04** · tier 4 · chiarezza · `tfr` is `unknown`

- "Ogni mese una parte dello stipendio va nel TFR: non è noto dove, e quindi nemmeno quanto
  si è accumulato finora."
- Question: "Dove va il mio TFR, e quanto si è accumulato?"
- Never imply: which destination is better.

**PE-05** · tier 4 · chiarezza · `BUSINESS` AND `pension_sim` in [never, where_start]

- "Con un lavoro in proprio la pensione si costruisce con i contributi versati: quanto stiano
  costruendo, finora, non è stato guardato."
- Question: "Che pensione sto costruendo con i contributi che verso?"
- Never imply: paying in more.

**PE-07** · tier 4 · chiarezza · `pension_fund == unsure_type` (NEW)

- "C'è un fondo pensione, ma non è noto di che tipo: da questo dipendono costi, regole e
  quello che succede ai versamenti, e la mappa non può dire altro."
- Question: "Che tipo di fondo pensione ho, e come funziona?"
- Never imply: which kind is better.

### Dropped since the second version

Inputs removed from the questionnaire: DE-02, DE-03 (`difficulty`), DE-04, DE-05 (`end_known`),
DE-09, DE-10 (`residual`), DE-11 (`guarantees`), SA-04, SA-06 (`access_known`, `horizon`),
SA-10 (`where`, `other_savings`), PR-04 (`income_stop`), PR-05 (`covers_known`),
PE-06 (`contributions`).

### One reading per topic

Some readings say the same thing in different words. Of each group below only the first that
fires, in the order listed, is printed, in its paragraph and among the highlights:

- the respondent's income stops and there is no cover: PR-02, PR-03, DE-07, PR-06;
- goals against what is put aside: SA-02, SA-03, SA-15;
- passing on the family business or wealth: PR-10, PR-11.

### Highlight selection (max 3)

1. Take fired sentences of tiers 1-5, sorted by tier, then by their order in this document.
2. Split them: strong (tiers 1-3) and weak (tiers 4-5). A weak sentence is never taken while a
   strong one is left.
3. Within the strong ones, then within the weak ones: first a sentence only if its area has no
   highlight yet, then the remaining ones in the same order.
4. Fewer than three fired means fewer than three highlights; nothing is invented.

---

## 7. Page layout (A4 portrait, 4 pages)

Dark ink on an off-white paper (`#f7f9fc`), brand navy `#0b2545` for headings and rules, blue
`#1e6fe8` only as a small accent (the highlight numbers and their lines); every state is
conveyed by a word and a shape, never by colour alone. Montserrat for headings (Light for the
page-1 numbers), Lato for text, all embedded. Section labels are small tracked capitals. Two
photographs: paper waves behind the page-1 masthead, a horizon closing page 4 (invitation
only). Footer on every page: "Mappa orientativa. Non è una consulenza e non contiene
raccomandazioni." (date and page n/4 sit in the top bar). The catalogue and rules versions are
not printed: they go in the PDF's metadata (Subject).
Draft documents carry a diagonal "BOZZA" mark on every page. Approved sentences are never cut.

**Page 1, "La tua mappa in breve"**

1. Title and date. One line: "Costruita sulle risposte che hai dato, come invito ad informarsi e
   discutere con professionisti"
2. "Il punto di partenza": one compact context line, no amounts. Parts with no answer are
   left out.
   - "{household_line} · {incomes_line} · {work_line} · {housing_line}", e.g. "Una coppia con
     due figli · la tua è l'entrata principale · lavoro dipendente · casa di proprietà con
     mutuo".
   - `household_line`: single → "Una persona"; married → "Una coppia"; separated → "Una
     persona separata o divorziata"; widowed → "Una persona vedova". Followed by " con
     {children_phrase}" when `children >= 1`. Left out when `marital` is missing.
   - `incomes_line`: sole → "una sola entrata in casa"; main → "la tua è l'entrata
     principale"; shared → "più entrate in casa"; secondary → "la tua è un'entrata secondaria".
   - `work_line`: employee → "lavoro dipendente"; professional → "libera professione";
     entrepreneur → "un'attività propria"; self_employed → "lavoro autonomo"; retired → "in
     pensione"; other → left out.
   - `housing_line`: main_home → "casa di proprietà"; other_only → "immobili di proprietà, non
     la prima casa"; both → "casa di proprietà e altri immobili"; none → "nessun immobile di
     proprietà". When `property` in [main_home, both] and `debt_types` includes mortgage, "casa
     di proprietà" becomes "casa di proprietà con mutuo".
3. "I numeri della mappa": four cells stacked beside the map, each a label and a computed
   value, or "non calcolabile" when the value cannot be computed. The value is split at its
   first digit: the words before it small ("restano tra"), the rest large ("300 e 1.900 €").
   - "A fine mese": `margin.lo >= 0` → "restano {margin_eur_short}"; `margin.hi <= 0` →
     "mancano {gap_eur_short}"; otherwise "da +{margin_hi} a −{gap_hi} €".
   - "La riserva copre": {cover_months}.
   - "Le rate in un anno": {instalments_year_eur_short}, or "nessuna rata".
   - "Tre mesi di spese e rate": {three_months_eur_short}.
   - `*_short` is the euro wording with "€" instead of "euro".
4. The map ("Le sei aree"): "Voi" at the centre, "Obiettivi" at the top and the six areas
   around them, each with its title and state (word + filled, half, empty or dashed circle,
   and one to three contour lines as the picture is more complete; none when not filled in).
   A line joins two places when a printed reading reads facts of both (`Reading.links`, from
   the rule's `reads`: answers sit where their field feeds (section 5), S01-S03 at the centre,
   S17 in the goals, computed facts with their inputs, S18 nowhere). The highlights' lines are
   blue and carry their number. A caption explains lines, contours and numbers.
5. "I punti da approfondire": the highlights, each with its number and its perspective (icon
   and name). If none: "Dalle risposte date non emergono punti da mettere in evidenza."
6. "Le cose che contano per voi": the goals, then one sentence. Left out entirely when S17
   was never answered.
   - "{goals_list}." with short names joined by commas and a final "e", first letter
     capitalised, e.g. "Il futuro dei figli, la pensione e il mutuo." Short names: buy_home →
     "comprare casa"; mortgage → "il mutuo"; capital → "accumulare un capitale"; grow_wealth →
     "far crescere il patrimonio"; extra_income → "una rendita integrativa"; retirement → "la
     pensione"; children → "il futuro dei figli"; protect → "proteggere il patrimonio
     familiare"; handover → "il passaggio generazionale"; freedom → "la libertà finanziaria";
     other → left out. Only `other` chosen: "Obiettivi diversi da quelli elencati."
   - Then "{saving_phrase}." (left out when it has no answer):
     `S` known → "Ogni mese si mettono da parte {saving_eur}", followed by ", di cui {pac_eur}
     in piani di accumulo" when `P` known and `pacShare.hi <= 100`; `cannot` → "Al momento non
     si riesce a mettere da parte nulla"; `no_quota` → "Una quota da mettere da parte non è
     ancora stata fissata".
7. "Per chi legge la mappa con te": the investments' origin, then the person's own words.
   - "Gli investimenti di oggi sono stati scelti {how}." where `how` lists, in the order of
     the question and joined by "e", each way named in `chosen_by`: self → "in autonomia";
     bank → "affidandosi alla banca"; advisor → "con un consulente finanziario"; post_office →
     "con un consulente di Poste Italiane". `other` has no wording; only other, or not shown →
     left out.
   - "L'aspetto da migliorare: «{improve}»" (Q37, trimmed, cut at 300 characters).
   - "La domanda: «{question}»" (Q38, the same).
   - The block is left out when all three are empty.
8. Legend of the five perspectives, each with its icon, in three columns:
   Chiarezza: quello che si sa e quello che non si sa · Coerenza: se obiettivi, abitudini e
   risorse vanno nella stessa direzione · Strategia: come le parti stanno insieme ·
   Protezione: cosa succede se qualcosa va storto · Trasmissione: chi viene dopo.
   If fewer than half of the visible schede were answered: "La mappa è incompleta: alcune aree
   non sono state compilate."

**Page 2**: areas IO, RI, DE. **Page 3**: areas SA, PR, PE.
Each area block: the map's node and the title, the state, the perspectives (icon and name)
and "Collegata a: …" (the places its readings link to), then the paragraph. Blocks spread down
the page when the paragraphs are short. No list of open questions. The
paragraph is set in the largest body size, from 12pt down, at which the page fits: these two
pages should read comfortably, not sit half empty. An
area with no printable sentence prints "Per questa area le risposte date non bastano a
calcolare nulla." (or the retired line for PE).

**Page 4, "Per andare avanti"**

1. "Le domande da portare con te": the question of each highlight, under the highlight's
   number, then the person's own (Q38), quoted.
2. "Cosa può servire avere sotto mano": items triggered by fired sentences (section 8).
3. Closing block, always the invitation: "Questa mappa è un punto di partenza. Se vuoi leggerla insieme a un
   consulente, puoi contattarci qui: decidi tu se e quando." + the URL and a QR code to
   https://mauroschileo.it/contatti/, then who the invitation comes from, as the consultant's
   own site states it: "Mauro Schileo, consulente finanziario. Iscritto all’Albo unico dei
   Consulenti Finanziari, sezione dei consulenti finanziari abilitati all’offerta fuori sede con
   delibera Consob n. 56 del 7/9/09. Albo tenuto dall’OCF – Organismo di vigilanza e tenuta
   dell’Albo unico dei Consulenti Finanziari." (also in the map email),
   on the horizon photograph that runs to the bottom edge (the footer sits on it, in light).

---

## 8. Supporting copy

**"Cosa può servire avere sotto mano"**

An item is listed when one of its sentences was printed and, where given, the answers show
that the thing exists: a rule alone does not say there is a statement or a policy to bring.

| id        | item                                                            | triggered by                             | only when                                                             |
| --------- | --------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| payslip   | L'ultima busta paga (o l'ultima dichiarazione dei redditi)      | IO-05, IO-08, PE-04, DE-12               |                                                                       |
| statement | L'estratto conto degli ultimi tre mesi                          | IO-02, IO-03, IO-08, RI-07               |                                                                       |
| loans     | I contratti o i piani delle rate in corso                       | DE-06, DE-07, DE-08, DE-12               |                                                                       |
| products  | Il rendiconto degli investimenti e dei prodotti di risparmio    | SA-03, SA-05, SA-07, SA-08, SA-13, SA-15 | `investments` in [yes, mostly_account], a financial holding, or a PAC |
| policies  | Le polizze che avete, anche quelle legate al mutuo              | DE-07, PR-02, PR-03, PR-06, PR-08        | `life_cover` answered and not `none`, or a mortgage                   |
| inps      | La simulazione della pensione dal sito INPS o della cassa       | PE-02, PE-03, PE-05                      |                                                                       |
| fund      | Il documento informativo del fondo pensione                     | PE-07                                    |                                                                       |
| taxes     | Le scadenze di tasse e contributi dell'ultimo anno (F24)        | RI-08                                    |                                                                       |
| assets    | Un elenco di quello che possedete, con il suo valore indicativo | SA-14, PR-11, PR-12, PR-13               | at least one asset kind (SA-14)                                       |

---

## 9. Personas (golden tests)

Invented. Expected results follow from the rules above; if the engine disagrees, the
disagreement is reported and resolved here, not silently changed in the test.

Fields not listed are missing. Hidden conditional fields are missing. Answers are listed by
scheda in field order.

**P1 Giulia, young renter, single, employee**
S01 18_25, single, no · S02 none · S03 employee, sole · S05 income_self 1500_2500 ·
S06 800_1500, no · S07 lt_10000, probably_no · S08 [personal_loan], lt_1000 · S09 no_quota ·
S10 no, [none] · S11 no · S13 no · S14 none · S15 pension_fund no, tfr unknown, pension_sim
never · S16 no, never_looked, later, too_small · S17 [buy_home, freedom].
Facts: margin [−1000, 1700] · coverMonths [0, 12.5].
Expected: highlights RI-05, SA-02, PE-04 · closing invitation · gather: the payslip only.

**P2 Marco ed Elena, couple with two children and a mortgage**
S01 36_45, married, two, none · S02 main_home · S03 employee, main · S05 income_household
2500_5000 · S06 1500_2500, sometimes · S07 10000_50000, probably_yes · S08 [mortgage, car],
1000_1500 · S09 variable, 100_500 · S10 mostly_account, [savings_book, insurance, property] ·
S11 no · S12 bank, neither, 3_5 · S13 vague · S14 tcm · S15 pension_fund no, tfr company,
children_pension neither, pension_sim never · S16 roughly, all, later ·
S17 [children, retirement, mortgage].
Facts: margin [−1500, 2500] · coverMonths [2.5, 20].
Expected: highlights PE-02, SA-05, PR-14 · SA prints SA-05, SA-14, SA-07 (SA-15
fires but the paragraph keeps three tiered sentences) · context line "Una coppia con due figli
· la tua è l'entrata principale · lavoro dipendente · casa di proprietà con mutuo".

**P3 Salvatore, separated parent, spending above income**
S01 46_55, separated, two, none · S02 none · S03 employee, sole · S05 income_self 1500_2500 ·
S06 1500_2500, no · S07 lt_10000, probably_no · S08 [personal_loan, salary_loan, overdraft],
1000_1500 · S09 cannot · S10 no, [none] · S11 no · S13 no · S14 none · S15 pension_fund no,
tfr unknown, children_pension unknown, pension_sim where_start · S16 no, not_sure, no, unaware ·
S17 [children, freedom].
Facts: margin [−2500, 1000] (salary loan) · coverMonths [0, 4].
Expected: highlights RI-03, PR-02, SA-02 · closing invitation · gather: payslip, loans, inps ·
numbers: "da +1.000 a −2.500 €", "fino a circa 4 mesi", "tra 12.000 e
18.000 €", "tra 7.500 e 12.000 €".

**P4 Francesca, couple, no children, bank products and a PAC**
S01 36_45, married, no · S02 both · S03 employee, shared · S05 income_household 5000_10000 ·
S06 1500_2500, regular · S07 50000_150000, adequate · S08 [none] · S09 monthly, 1000_2000 ·
S10 yes, [funds, insurance, etf, govt_bonds, pension_fund, property] · S11 yes, 250_500 ·
S12 bank, returns_only, 5_10 · S13 vague · S14 other · S15 pension_fund open, tfr fund,
pension_sim knows · S16 unsure, all, thought · S17 [retirement, grow_wealth, protect].
Facts: margin [2500, 8500] · coverMonths [20, 100] · pacShare [12.5, 50].
Expected: highlights SA-05, PR-07, SA-07 · firm point IO-06 · PE-01 "tutti noti".

**P5 Anna, mostly "non lo so"**
S01 26_35, married, one, none · S02 none · S03 employee, shared · S05 income_household
unknown · S06 unknown, no · S07 unknown, never_assessed · S08 [car], unknown · S09 occasional,
unknown · S10 no, [none] · S11 no · S13 no · S14 unknown · S15 pension_fund unsure_type, tfr
unknown, children_pension unknown, pension_sim where_start · S16 no, never_looked, no, unaware ·
S17 [buy_home].
Expected: highlights SA-03, IO-05, RI-07 · all six areas "Quadro da ricostruire"
· all four numbers "non calcolabile".

**P6 Luca, self-employed, sole income, three children**
S01 36_45, married, three_plus, none · S02 main_home · S03 self_employed, sole · S04 partly,
irregular, stops · S05 income_household 2500_5000 · S06 1500_2500, sometimes · S07 lt_10000,
probably_no · S08 [mortgage], lt_1000 · S09 occasional, lt_100 · S10 no, [property] · S11 no ·
S13 vague · S14 none · S15 pension_fund no, children_pension neither, pension_sim never ·
S16 roughly, all, later · S17 [children, retirement].
Facts: margin [−1000, 3500] · coverMonths [0, 6.67].
Expected: highlights RI-03, PR-02, PE-02 · PR prints PR-02, PR-09, PR-14; DE-07 and
PR-06 give way to PR-02 (one reading per topic).

**P7 Rosa, retired widow, home-owner**
S01 over_65, widowed, two, all · S02 main_home · S03 retired, sole · S05 income_self
1500_2500 · S06 800_1500, regular · S07 10000_50000, adequate · S08 [none] · S09 occasional,
100_500 · S10 mostly_account, [savings_book, govt_bonds, property] · S11 no · S12 self, both,
over_10 · S13 no · S14 other · S15 children_pension unknown · S16 roughly, all, no, by_law ·
S17 [protect, children].
Facts: margin [0, 1700] · coverMonths [6.67, 62.5].
Expected: highlights SA-03, PR-12, SA-14 · PE prints the retired line · IO-01
first variant ("fino a 1.700 euro").

**P8 Davide, stopped after five schede**
S01 26_35, single, no · S02 none · S03 employee, sole · S05 income_self 1500_2500 ·
S06 withheld, sometimes.
Expected: no highlights · IO "Quadro da ricostruire" (income clear, tracking
unclear, fixed withheld) with the withheld line · RI, DE,
SA, PR, PE "Non compilata" · page 1 carries the "mappa incompleta" line · closing invitation.

**P9 Roberto, business owner with two children**
S01 56_65, married, two, some · S02 both · S03 entrepreneur, main · S04 no, irregular, stops ·
S05 income_household 10000_25000 · S06 2500_5000, sometimes · S07 50000_150000,
sell_investments · S08 [car, overdraft], lt_1000 · S09 variable, 1000_2000 · S10 yes, [shares,
etf, insurance, business_stakes, property] · S11 yes, 500_1000 · S12 advisor, costs_only, 1_3 ·
S13 vague · S14 tcm · S15 pension_fund no, children_pension fund_only, pension_sim forgot ·
S16 roughly, some, thought · S17 [handover, protect, extra_income].
Facts: margin [4000, 22500] · coverMonths [8.33, 60] · pacShare [25, 100].
Expected: highlights RI-03, PR-09, DE-06 · RI prints RI-03, RI-04, RI-08 · PR
prints PR-09, PR-10, PR-06 (PR-11 gives way to PR-10) · closing invitation.

---

## 10. Content choices and notes

Mauro and Chiara approved the questionnaire, these choices and every map sentence on 2026-11-11
(rules 1.0.0); the list stays as the record of what was decided.

For Mauro and Chiara (choices we made on the approved questionnaire):

- Conditionals were not marked in the questionnaire; we set them as in section 3 (Q4, Q8-Q10,
  Q11 wording, Q17, Q19, Q23, Q24-Q26, Q29, Q30, Q31, Q32, Q35b, and some single options).
- Q11 is asked in two wordings by Q2: "le tue entrate nette" (single, separated, divorced,
  widowed) or "le entrate nette della tua famiglia" (married, cohabiting, or Q2 not answered), because Q12 asks for the
  family's spending and the map compares the two.
- Q12 bands overlapped (800-1.500 and 1.200-1.600) and skipped 2.500-5.000: fixed to
  <800 · 800-1.500 · 1.500-2.500 · 2.500-5.000 · >5.000.
- Q14 "Non lo so preferisco non dirlo" split into the two standard answers.
- Q17, Q19, Q23 also offer "Non lo so" (every amount question offers both answers).
- Q23 bands written as 100-250 · 250-500 · 500-1.000, like the others.
- Q31: "Non ho figli" removed (the question is shown only to who has children); options
  reworded so they read alike; "Non lo so" added for who has not checked.
- Q35b: "Penso sia un argomento da affrontare in futuro" is not offered to who chose "Penso sia
  un tema da affrontare più avanti" in Q35 (same answer twice).
- Q36: no limit on the number of goals (the second version allowed three).
- Q19 (how much is put aside) is also asked after "Non ho mai definito una quota di risparmio":
  that answer says whether there is a fixed share, not whether one saves.
- Q21 asks again about property and pension funds (Q5, Q29); kept as approved.

For the map:

- No special closing for financial hardship: the client decided the event does not target
  people in financial difficulty (2026-11-09).
- The unexpected expense of RI-02 is a reference amount chosen by income band; Q15 names no
  amount. Reviewers to confirm it still reads well beside Q15.
- PE-04, PE-05, PE-07, DE-12 and PR-12 (`by_law`) each contain one general statement about how
  TFR, contributions, pension funds, salary loans, overdrafts or the law of succession work.
  Legal review to confirm the wording.
- Sentences that state an inference rather than a computation, for the reviewers and for legal
  review: IO-02 (second variant), IO-03 (`cannot`), RI-04 (first variant).
- S18: two free-text answers (Q37, Q38) reach the consultants on page 1 and page 4 with no
  human reading in between; the help line alone may not keep names or health details out.
  Moderation still to be decided.
- The map says "voi" throughout, like the survey. For a person living alone ("Una persona")
  that reads slightly off; a singular set of templates would double the copy to approve.
- The liquidity bands start at "Meno di 10.000 €": for most households the reserve in months
  comes out wide ("fino a circa …"). The questionnaire is approved; noted for a future version.
- All copy needs Mauro's and Chiara's review, then legal review of pages 1 and 4.

Changes of 2026-11-12 (questionnaire 2026-11-12, rules 1.0.1), asked by the client:

- Q2 splits "Sposato/a o convivente" and "Separato/a o divorziato/a" into four answers. The map
  still says "Una coppia" for both married and cohabiting, "Una persona separata" and "Una
  persona divorziata" for the others. Answers saved before keep their value (`married`,
  `separated`) and read as "Sposato/a" and "Separato/a".
- Q24 accepts several answers. Answers saved as a single choice are read as a one-item list.
- Seven sheet prompts renamed (S04, S05, S07, S09, S14, S16, S17), without the final full stop.
- IO-04 now also applies to `cohabiting` and SA-07 applies when bank or Poste is among the
  answers: the conditions follow the split questions and the texts are unchanged, so both keep
  `approved: true` by the client's decision (2026-11-12) instead of going back to draft.
