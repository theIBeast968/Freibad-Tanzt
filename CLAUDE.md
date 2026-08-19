# Freibad Tanzt – Projektregeln

Statische Website + Netlify Functions. Kein Framework, kein Build-Step ausser `npm install`.

## WICHTIGSTE REGEL: Immer zuerst den Live-Zustand holen

**`main` IST die Live-Seite.** Jeder Push auf `main` deployt Netlify sofort auf
freibad-tanzt.de. Es gibt keinen Zwischenschritt, kein Staging, kein Undo per Klick.

Daraus folgt: **Bevor du auch nur eine Zeile aenderst, holst du dir den aktuellen Stand.**

```
git switch main
git pull --rebase origin main
```

Das gilt **jedes Mal**, wenn du an dem Projekt anfaengst zu arbeiten – auch wenn du
gestern schon dran warst, auch wenn es "sicher noch aktuell" ist. Es arbeiten mehrere
Leute an diesem Repo. Wer auf einem alten Stand aufsetzt, ueberschreibt fremde Aenderungen
oder produziert Konflikte in Dateien, die er gar nicht angefasst hat.

Wenn du seit dem letzten Pull laenger als ein paar Stunden dran warst: **vor dem Push
nochmal pullen**.

```
git pull --rebase origin main
git push origin main
```

**Niemals `git push --force`.** Damit loeschst du fremde Commits aus der Historie.
Wenn ein Push abgelehnt wird, ist die Antwort immer `git pull --rebase`, nie `--force`.

## Arbeitsweise

- Direkt auf `main` arbeiten ist erlaubt. Dafuer gilt die Sync-Regel oben ohne Ausnahme.
- Commits klein und beschreibend halten, deutsche Commit-Messages.
- `git status` **vor** jedem `git add` lesen. `git add -A` nimmt alles mit, was gerade
  rumliegt – auch Sachen, die nicht dazugehoeren.
- Bei groesseren oder riskanten Umbauten (Login, Bezahlung, Datenstruktur) trotzdem
  lieber einen Branch + Pull Request. Netlify baut dazu automatisch eine Deploy-Preview,
  der Link steht im PR. Dort testen statt live.
- Keine `npm install <paket>` ohne Ruecksprache mit Sven. Abhaengigkeiten klein halten.

## Vor dem Push pruefen

- Laeuft die Seite lokal mit `npx netlify dev` fehlerfrei?
- Steht in `git status` nichts drin, was nicht committed werden sollte (Secrets,
  Exporte, Testbilder, `node_modules`)?
- Wurde eine Function angefasst? Dann den betroffenen Bereich lokal einmal durchklicken.

## Secrets

Die Produktiv-Secrets stehen **nur** in den Netlify-Environment-Variablen, nie im Repo.
Fuer lokale Entwicklung `.env.example` nach `.env` kopieren und eigene Testwerte eintragen.
`.env` ist gitignored – dabei bleibt es.

Benoetigte Variablen: `STAFF_JWT_SECRET`, `STAFF_INVITE_CODE`, `STAFF_ADMIN_EMAILS`,
`STATS_JWT_SECRET`, `STATS_PASSWORD`.

## Lokal starten

```
npm install
npx netlify dev      # Seite + Functions auf http://localhost:8888
```

Ohne `netlify dev` laufen die Functions und der Mitarbeiter-Bereich nicht.

## Struktur

- `index.html`, `mitarbeiter.html` – Seiten
- `js/` – Frontend-Skripte
- `netlify/functions/` – Backend (Login, Schichten, Aufgaben, Stats, Tracking)
- `netlify/functions/lib/` – geteilte Helfer
- Daten liegen in **Netlify Blobs**, es gibt keine klassische Datenbank.
- `attractions/`, `bands/`, `gallery/`, `exports/` – Inhalte und Assets

## Stil

- Deutsche Texte, Umlaute ausschreiben (ae/oe/ue nur in Dateinamen und Code-Bezeichnern).
- In Seitentexten **keine** Geviertstriche ` — `, stattdessen Komma, Doppelpunkt oder Punkt.
- Bestehenden Look nachbauen, kein eigenes Design-System einfuehren.
