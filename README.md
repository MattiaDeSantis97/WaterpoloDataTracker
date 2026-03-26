```markdown
# WaterPoloData

Applicazione web per l'analisi statistica e tecnica delle partite di pallanuoto. Il sistema acquisisce i dati dei match e utilizza l'intelligenza artificiale per generare report analitici dettagliati sulle prestazioni di squadra e individuali.

## Funzionalità
* **Autenticazione:** Accesso sicuro tramite account Google.
* **Inserimento Dati:** Registrazione dei parziali (quarti), statistiche di superiorità numerica (uomo in più) e metriche individuali dei giocatori (gol, espulsioni, ecc.).
* **Analisi AI:** Generazione di report tecnici automatizzati tramite modello LLM, con individuazione di MVP, miglior difensore e analisi dell'efficienza.
* **Archiviazione:** Salvataggio cloud delle partite e delle relative analisi testuali.
* **Dashboard:** Interfaccia utente per la consultazione dello storico dei match.

## Stack Tecnologico
* **Front-end:** React 18, Vite, Recharts, Axios.
* **Back-end:** Python 3.9, Flask (implementato come Serverless Function).
* **AI Provider:** Google Gemini 1.5 Flash (Google GenAI SDK).
* **Database & Auth:** Firebase (Cloud Firestore, Google Authentication).
* **Infrastruttura di Deploy:** Vercel.

## Prerequisiti
* Node.js e npm installati.
* Python 3.9 installato.
* Progetto Firebase configurato (Firestore Database attivo e Google Sign-In abilitato).
* Chiave API Google Gemini valida.

## Variabili d'Ambiente
Creare un file `.env` nella directory principale del progetto. Parametri richiesti:

```env
# Configurazione Firebase (Front-end)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Configurazione LLM (Back-end)
GEMINI_API_KEY=
```

## Installazione e Sviluppo Locale

1. **Installazione dipendenze Front-end:**
   ```bash
   npm install
   ```

2. **Installazione dipendenze Back-end:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Avvio Front-end (Vite):**
   ```bash
   npm run dev
   ```

4. **Avvio Back-end locale:**
   ```bash
   python api/index.py
   ```

## Deploy (Vercel)
Il progetto è preconfigurato per il deployment su Vercel tramite il file `vercel.json`, che gestisce il routing del front-end React e l'esecuzione del back-end Python in ambiente serverless.

1. **Esecuzione Deploy:**
   ```bash
   npx vercel --prod
   ```
2. **Post-Deploy:**
   * Inserire `GEMINI_API_KEY` nella sezione *Environment Variables* della dashboard di Vercel ed eseguire un Redeploy.
   * Aggiungere il dominio assegnato da Vercel (es. `tuo-progetto.vercel.app`) alla lista degli *Authorized Domains* nelle impostazioni di Firebase Authentication.
```
