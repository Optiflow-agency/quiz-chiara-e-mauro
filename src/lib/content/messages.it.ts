/** UI chrome copy (Italian). Survey sheets live in sheets.it.json. */
export const messages = {
	welcome: {
		title: 'La tua mappa finanziaria',
		accent: 'mappa',
		intro:
			'Rispondi pensando a te e alla tua famiglia: a chi condivide con te entrate e spese. Nessuna risposta giusta o sbagliata: se qualcosa non vuoi indicarlo, scegli «Preferisco non dirlo».',
		note: 'Poche domande per mettere a fuoco la tua situazione e arrivare all’evento con le idee più chiare.',
		// PLACEHOLDER: the duration (up to 38 questions) is an estimate and must be verified before launch.
		duration: 'Circa 10-12 minuti',
		cta: 'Iniziamo'
	},
	survey: {
		pageTitle: 'La tua mappa finanziaria · Guadagnare non basta+',
		description: 'Poche domande per mettere a fuoco la tua situazione prima dell’evento.'
	},
	brand: { before: 'Guadagnare non ', accent: 'basta', plus: '+' },
	privacyUrl: 'https://www.mauroechiaralive.com/legal/privacy.html',
	eventUrl: 'https://www.mauroechiaralive.com/',
	nav: {
		dockPrevious: 'Torna alla domanda precedente',
		dockNext: 'Vai alla domanda successiva',
		next: 'Avanti',
		progress: 'Avanzamento del percorso',
		profile: 'Profilo',
		skip: 'Salta',
		back: 'Indietro',
		start: 'Inizia',
		exit: 'Esci',
		exitLabel: 'Esci dal questionario: le risposte restano salvate'
	},
	sheet: {
		clear: 'Cancella risposta',
		why: 'Perché te lo chiediamo',
		textHint: 'Non inserire IBAN, credenziali o dati sanitari.'
	},
	saveStatus: {
		local: 'Risposte salvate su questo dispositivo',
		saved: 'Risposte salvate',
		problem: {
			offline: 'Connessione assente: riproviamo a salvare.',
			server: 'Il salvataggio non è riuscito: riproviamo a breve.',
			rate_limited: 'Troppe richieste: riproviamo a breve.',
			session: 'La sessione è scaduta. Ricarica la pagina per continuare.',
			consent: 'Senza il consenso non possiamo salvare le risposte. Ricarica la pagina.',
			rejected: 'Non siamo riusciti a salvare alcune risposte. Controlla i valori inseriti.'
		}
	},
	field: {
		unknown: 'Non lo so',
		withheld: 'Preferisco non dirlo',
		maxChoices: (max: number) => `Al massimo ${max} scelte.`
	},
	gate: {
		title: 'Per continuare, ci serve il tuo ',
		accent: 'consenso',
		intro:
			'Fin qui le tue risposte sono rimaste solo su questo dispositivo. Per proseguire e preparare la tua mappa, indica la tua email e dai il tuo consenso. Verificherai l’email alla fine.',
		introSession: 'Per proseguire, dai il tuo consenso.',
		emailLabel: 'Email',
		emailInvalid: 'Inserisci un indirizzo email valido.',
		processing:
			'Acconsento al trattamento dei miei dati per preparare la mia mappa finanziaria e per condividerla con i professionisti dell’evento, come previsto dall’informativa privacy.',
		processingRequired: 'Questo consenso è necessario per proseguire.',
		privacyLink: 'Leggi l’informativa privacy',
		submit: 'Sblocca le prossime domande',
		sendFailed: 'Non siamo riusciti a completare l’operazione. Riprova tra qualche minuto.',
		rateLimited: 'Troppi tentativi ravvicinati. Attendi qualche minuto e riprova.',
		grantedTitle: 'Grazie per il ',
		grantedAccent: 'consenso',
		granted: 'Abbiamo registrato il tuo consenso. Puoi proseguire con le prossime domande.'
	},
	securityCheck: {
		unavailable:
			'Non riusciamo a eseguire il controllo di sicurezza. Ricarica la pagina e riprova.',
		failed: 'Il controllo di sicurezza non è andato a buon fine. Riprova.'
	},
	end: {
		title: 'Per ora è ',
		accent: 'tutto',
		answered: (answered: number, total: number) =>
			`Hai risposto a ${answered} domande su ${total}. Le altre restano da completare, se vorrai.`,
		notAdvice:
			'Questo percorso non fornisce consulenza né indicazioni su prodotti o investimenti: serve a preparare una conversazione.',
		submit: 'Invia le risposte',
		submitting: 'Invio in corso…'
	},
	thanks: {
		pageTitle: 'Grazie · Guadagnare non basta+',
		title: 'Grazie, ',
		accent: 'a presto',
		body: 'Abbiamo ricevuto le tue risposte.',
		delivery: 'La tua mappa finanziaria ti verrà consegnata ',
		deliveryAccent: 'all’evento',
		notAdvice:
			'Serve a orientare una conversazione, non è una consulenza: ogni indicazione sulla tua situazione potrà arrivare solo da un consulente, in un colloquio diretto.',
		profile: 'Vai al tuo profilo',
		countdown: {
			kicker: 'Ci vediamo all’evento',
			when: 'Sabato 21 novembre · ore 15:00',
			units: { days: 'giorni', hours: 'ore', minutes: 'minuti', seconds: 'secondi' },
			live: 'L’evento è iniziato: ti aspettiamo.'
		}
	},
	profile: {
		pageTitle: 'Il tuo profilo · Guadagnare non basta+',
		title: 'Il tuo ',
		accent: 'profilo',
		answers: (count: number) =>
			count === 1 ? '1 scheda con risposte salvate' : `${count} schede con risposte salvate`,
		backToSurvey: 'Torna al questionario',
		signIn: {
			title: 'Accedi al tuo ',
			accent: 'profilo',
			intro:
				'Indica la tua email: ti inviamo un codice a 6 cifre per accedere. Dal profilo gestisci il tuo consenso e i tuoi dati.',
			emailLabel: 'Email',
			emailInvalid: 'Inserisci un indirizzo email valido.',
			note: 'Se non hai ancora un account, lo creiamo con questo indirizzo.',
			privacyLink: 'Leggi l’informativa privacy',
			button: 'Invia il codice',
			codeSent: (email: string) =>
				`Abbiamo inviato un codice a 6 cifre a ${email}. Scrivilo qui sotto: vale 10 minuti.`,
			spamHint: 'Non trovi l’email? Controlla anche nella cartella spam (posta indesiderata).',
			codeLabel: 'Codice a 6 cifre',
			codeInvalid: 'Inserisci le 6 cifre del codice.',
			verify: 'Conferma il codice',
			checking: 'Verifichiamo il codice…',
			verified: 'Codice verificato',
			wrongCode: 'Il codice non è corretto o è scaduto.',
			expired: 'Il codice è scaduto. Richiedine uno nuovo.',
			resend: 'Invia un nuovo codice',
			resendWarning: 'Con un nuovo codice, quello precedente smette di valere: usa solo l’ultimo.',
			changeEmail: 'Usa un’altra email',
			sendFailed: 'Non siamo riusciti a completare l’operazione. Riprova tra qualche minuto.',
			rateLimited: 'Troppi tentativi ravvicinati. Attendi qualche minuto e riprova.'
		},
		verify: {
			title: 'Verifica la tua ',
			accent: 'email',
			intro:
				'Per concludere, verifica la tua email: ti inviamo un codice a 6 cifre. Dopo la verifica trovi qui il tuo profilo e il tuo consenso.',
			note: 'Se questo indirizzo ha già partecipato, le risposte appena date sostituiranno quelle precedenti.'
		},
		account: {
			title: 'Account',
			signedIn: 'Hai effettuato l’accesso con questo indirizzo.',
			logout: 'Esci'
		},
		consentsTitle: 'Il tuo consenso',
		consentsIntro: 'Puoi revocarlo in qualsiasi momento. Ogni scelta viene registrata.',
		consents: {
			processing:
				'Trattamento dei dati per preparare la mappa e condividerla con i professionisti dell’evento'
		},
		granted: 'Concesso',
		notGranted: 'Non concesso',
		revoke: 'Revoca',
		processingOff: 'Senza questo consenso non salviamo le tue risposte.',
		giveConsentAgain: 'Per ripartire, torna al questionario e dai di nuovo il consenso.',
		withdraw: {
			warning:
				'Se revochi questo consenso smettiamo di trattare le tue risposte e le cancelliamo in modo definitivo, sul server e su questo dispositivo. Potrai ripartire in seguito dando di nuovo il consenso.',
			confirm: 'Conferma revoca',
			cancel: 'Annulla',
			pending: 'Attendi…'
		},
		data: {
			title: 'I tuoi dati',
			exportTitle: 'Copia dei tuoi dati',
			intro: 'Puoi scaricare una copia di tutti i dati che abbiamo su di te, in formato JSON.',
			download: 'Scarica'
		},
		deleteAccount: {
			title: 'Elimina l’account',
			intro: 'Cancella in modo definitivo l’account e tutte le tue risposte.',
			staff:
				'Gli account dello staff non si possono eliminare. Per farlo, chiedi prima di essere tolto dall’elenco dello staff.',
			button: 'Elimina',
			warning:
				'Eliminiamo il tuo account e tutte le tue risposte, in modo definitivo. Lo storico dei consensi e degli accessi resta conservato, senza alcun collegamento con te, perché serve a dimostrare il rispetto delle regole sulla privacy. L’operazione non si può annullare.',
			confirm: 'Conferma eliminazione'
		},
		error: 'Non siamo riusciti a completare l’operazione. Riprova tra poco.',
		map: {
			title: 'La tua mappa',
			pending: 'La mappa sarà disponibile durante l’evento.'
		},
		admin: {
			role: 'Account staff dell’evento',
			title: 'Area riservata',
			detail: 'Cerca i partecipanti, stampa la mappa di chi l’ha condivisa o inviala per email.',
			open: 'Apri'
		},
		stats: {
			title: 'Statistiche del questionario',
			detail: 'Quanti iniziano, completano o si fermano, domanda per domanda. Solo dati aggregati.',
			open: 'Apri'
		}
	},
	stats: {
		pageTitle: 'Statistiche · Guadagnare non basta+',
		title: 'Le ',
		accent: 'statistiche',
		intro:
			'Numeri aggregati sull’uso del questionario, senza dati personali. I valori da 1 a 4 e le medie su meno di 5 casi sono mostrati come «< 5».',
		staffNote:
			'Le visite e le risposte date da un account dello staff non vengono contate, nemmeno prima del consenso. Per provare il questionario usa una finestra anonima o un altro browser in cui non hai fatto l’accesso.',
		back: 'Torna all’area riservata',
		open: 'Statistiche',
		openDetail: 'Quanti iniziano, completano o si fermano, domanda per domanda.',
		error: 'Non riusciamo a leggere le statistiche. Riprova tra poco.',
		filters: {
			legend: 'Filtri',
			from: 'Dal',
			to: 'Al',
			device: 'Dispositivo',
			version: 'Versione del questionario',
			allDevices: 'Tutti',
			allVersions: 'Tutte',
			apply: 'Applica',
			reset: 'Ripristina'
		},
		devices: { smartphone: 'Smartphone', tablet: 'Tablet', computer: 'Computer' },
		download: 'Scarica CSV',
		views: {
			riepilogo: {
				title: 'Riepilogo',
				note: 'Visite e iniziati contano i caricamenti di pagina: sono valori approssimativi, perché chi ricarica la pagina viene contato due volte. I percorsi con consenso sono quelli di chi ha acconsentito al trattamento.',
				columns: ['Indicatore', 'Valore']
			},
			imbuto: {
				title: 'Imbuto per domanda',
				note: 'Quante persone arrivano a ciascuna domanda, nell’ordine del questionario. Alcune domande compaiono solo in base alle risposte precedenti: è normale che le raggiungano meno persone.',
				columns: ['Domanda', 'Raggiunta da', 'Calo rispetto alla precedente']
			},
			tempi: {
				title: 'Tempi',
				note: 'Tempo di permanenza sulla schermata, in minuti e secondi, dai percorsi con consenso.',
				columns: ['Domanda', 'Misure', 'Tempo medio', 'Tempo mediano']
			},
			risposte: {
				title: 'Risposte',
				note: 'Solo percorsi conclusi (completati o abbandonati da almeno 7 giorni), con l’ultimo esito di ogni domanda. Il trattino indica che la domanda non prevede quell’opzione. Non sono mostrati i valori delle risposte.',
				columns: [
					'Domanda',
					'Percorsi che l’hanno raggiunta',
					'Risposte',
					'Saltate',
					'Non lo so',
					'Preferisco non dirlo'
				]
			},
			dispositivi: {
				title: 'Dispositivi',
				note: 'Le visite contano i caricamenti di pagina; i percorsi sono classificati per il dispositivo con cui sono iniziati.',
				columns: [
					'Dispositivo',
					'Visite',
					'Quota visite',
					'Percorsi con consenso',
					'Quota percorsi'
				]
			},
			riprese: {
				title: 'Pause e riprese',
				note: 'Una pausa è un intervallo di almeno 30 minuti tra due passaggi di un percorso con consenso; una ripresa è un passaggio successivo alla pausa.',
				columns: ['Indicatore', 'Valore']
			}
		},
		rows: {
			visits: 'Visite (caricamenti di pagina)',
			started: 'Iniziati (prima risposta data)',
			gate: 'Arrivati al consenso',
			journeys: 'Percorsi con consenso',
			completed: 'Completati',
			inProgress: 'In corso (attivi negli ultimi 7 giorni)',
			abandoned: 'Abbandonati (fermi da almeno 7 giorni)',
			completionRate: 'Tasso di completamento (completati / iniziati)',
			abandonRate: 'Tasso di abbandono complessivo',
			totalTime: 'Tempo totale (percorsi completati)',
			resumed: 'Percorsi ripresi dopo una pausa',
			resumedShare: 'Quota dei percorsi',
			pauseMean: 'Durata media della pausa',
			pauseMedian: 'Durata mediana della pausa',
			otherDevice: 'Riprese su un altro dispositivo',
			gateLabel: 'Consenso'
		}
	},
	admin: {
		pageTitle: 'Area riservata · Guadagnare non basta+',
		title: 'Area ',
		accent: 'riservata',
		intro: 'Partecipanti con email verificata.',
		searchLabel: 'Cerca per email',
		search: 'Cerca',
		clear: 'Mostra tutti',
		count: (n: number) => (n === 1 ? '1 partecipante' : `${n} partecipanti`),
		matches: (n: number, query: string) =>
			n === 1 ? `1 risultato per «${query}»` : `${n} risultati per «${query}»`,
		searchHint: 'Trova anche indirizzi scritti in modo approssimativo.',
		requestedOnly: 'Solo chi ha chiesto un colloquio',
		countRequested: (n: number) =>
			n === 1
				? '1 partecipante ha chiesto un colloquio'
				: `${n} partecipanti hanno chiesto un colloquio`,
		noRequests: 'Nessun partecipante ha ancora chiesto un colloquio.',
		empty: 'Nessun partecipante idoneo, per ora.',
		noMatches: 'Nessun partecipante corrisponde alla ricerca.',
		pagination: 'Pagine',
		previous: 'Precedenti',
		next: 'Successivi',
		pageOf: (page: number, pages: number) => `Pagina ${page} di ${pages}`,
		pastEnd: 'Questa pagina è vuota.',
		firstPage: 'Torna alla prima pagina',
		answered: (n: number) => (n === 1 ? '1 scheda' : `${n} schede`),
		lastAnswer: (date: string) => `ultima risposta il ${date}`,
		requested: 'Ha chiesto un colloquio',
		openMap: 'Apri la mappa',
		sendMap: 'Manda per email',
		sending: 'Invio…',
		sent: (email: string) => `Mappa inviata a ${email}.`,
		sendFailed: {
			unavailable: 'L’invio delle email non è configurato.',
			missing: 'Questa mappa non è più disponibile.',
			error: 'Invio non riuscito. Riprova tra poco.'
		},
		noAnswers: 'Nessuna risposta',
		error: 'Non riusciamo a leggere l’elenco. Riprova tra poco.',
		navigation: 'Navigazione',
		backToProfile: 'Torna al profilo',
		backToSurvey: 'Torna al questionario'
	}
} as const;
