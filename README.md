# 🧶 I miei lavori all'uncinetto

Piccola web app per tenere traccia dei lavori ad uncinetto. Per ogni lavoro puoi salvare:

- **Foto** del lavoro (scelta dalla galleria o scattata col telefono)
- **Modello**: descrizione/schema in testo (i link diventano cliccabili) e un file allegato (immagine o PDF)
- **Passi da fare**: una lista ordinata da spuntare man mano, con barra di avanzamento
- Filato e misura dell'uncinetto

Altre funzioni: ricerca, modifica/riordino dei passi, incolla di più passi insieme (uno per riga), backup ed importazione in JSON dal menu `⋯`.

## Come usarla

Non serve installare nulla: è un sito statico (HTML, CSS, JavaScript).

- Apri `index.html` nel browser, **oppure**
- avviala in locale: `python3 -m http.server` e vai su http://localhost:8000, **oppure**
- pubblicala con **GitHub Pages** (Settings → Pages → Branch) per usarla dal telefono.

I dati vengono salvati **nel browser** (IndexedDB) del dispositivo che usi: usa *Esporta backup* per conservarli o spostarli su un altro dispositivo.

## 📱 Usarla sul telefono

L'app si può installare come un'app vera (icona nella schermata Home, funziona anche senza internet).

1. **Pubblicala online con GitHub Pages**: su GitHub vai in *Settings → Pages*, in *Branch* scegli il ramo `main` e la cartella `/ (root)`, poi *Save*. Dopo un paio di minuti compare l'indirizzo, tipo `https://natasha87n-wq.github.io/app-crochet/`.
   GitHub Pages è gratis per i repo **pubblici**; per un repo privato serve GitHub Pro.
2. **Apri l'indirizzo dal telefono** e aggiungila alla Home:
   - **iPhone (Safari)**: tasto Condividi ⬆️ → *Aggiungi alla schermata Home*
   - **Android (Chrome)**: menu ⋮ → *Installa app* (o *Aggiungi a schermata Home*)

## File

| File | Contenuto |
|------|-----------|
| `index.html` | Struttura delle schermate (lista, dettaglio, modifica) |
| `style.css`  | Stile (con tema scuro automatico) |
| `db.js`      | Salvataggio locale con IndexedDB |
| `app.js`     | Logica dell'app |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installazione sul telefono e uso offline |
