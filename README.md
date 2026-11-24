# Cose Preziose

Videogioco horror punta-e-clicca ispirato all'escape room **Emporium** (Novate Milanese).
Diego torna a Rocca del Castello nel 1974 e deve riportare all'Emporio gli oggetti maledetti venduti dall'Uomo in nero.

- 3D in bianco e nero (Three.js), testi in italiano e inglese
- Web app installabile (PWA), da giocare in orizzontale
- Versione 0.1: mappa, Emporio, Premiata Macelleria (Atto I), Salone del barbiere

## Sviluppo

```bash
npm install
npm run dev          # server locale
npm run build        # build per GitHub Pages (cartella dist)
npm run build:single # un unico file HTML (cartella dist-single)
```

Ogni push su `main` pubblica il gioco su GitHub Pages tramite `.github/workflows/deploy.yml`.

## Struttura

- `src/engine.ts` — rendering, filtro pellicola, telecamera e tocchi
- `src/game.ts` — stato di gioco, inventario, dialoghi, aiuti di Lisa
- `src/locations/` — un file per luogo (mappa, emporio, macelleria, barbiere)
- `src/i18n/it.json`, `src/i18n/en.json` — tutti i testi, nomi compresi
