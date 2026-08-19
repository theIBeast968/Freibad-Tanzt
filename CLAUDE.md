# Freibad Tanzt – Projektregeln

Statische Website + Netlify Functions. Kein Framework, kein Build-Step ausser `npm install`.

## Arbeitsweise (gilt fuer alle Mitarbeitenden)

- **Niemals direkt auf `main` pushen.** Immer eigener Branch + Pull Request.
  ```
  git switch -c feature/kurzer-name
  # ... Aenderungen ...
  git add -A && git commit -m "Beschreibung"
  git push -u origin feature/kurzer-name
  gh pr create --fill
  ```
- Netlify baut zu **jedem PR automatisch eine Deploy-Preview**. Der Link steht im PR.
  Dort testen – nicht auf der Live-Seite.
- Gemergt wird ausschliesslich von Sven. Nach dem Merge deployt Netlify die Live-Seite selbst.
- Keine `npm install <paket>` ohne Ruecksprache. Abhaengigkeiten bewusst klein halten.

## Secrets

Die Produktiv-Secrets stehen **nur** in den Netlify-Environment-Variablen, nie im Repo.
Fuer lokale Entwicklung `.env.example` nach `.env` kopieren und eigene Testwerte eintragen.
`.env` ist gitignored – dabei bleibt es.

Benoetigte Variablen: `STAFF_JWT_SECRET`, `STAFF_INVITE_CODE`, `STAFF_ADMIN_EMAILS`,
`STATS_JWT_SECRET`, `STATS_PASSWORD`.

## Lokal starten

```
npm install
npx netlify dev      # startet Seite + Functions auf http://localhost:8888
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
