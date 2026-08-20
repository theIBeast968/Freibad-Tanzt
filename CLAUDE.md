# Freibad Tanzt

Statische Website plus Netlify Functions. Kein Framework, kein Build-Step außer `npm install`.

## Deployment

`main` ist die Live-Seite. Jeder Push deployt sofort auf freibad-tanzt.de, es gibt kein Staging.

Daraus folgen zwei Pflichten:

- **Vor Arbeitsbeginn** `git pull --rebase origin main`. Am Repo arbeiten mehrere Leute, ein alter Ausgangsstand überschreibt fremde Änderungen.
- **Vor dem Push** nochmal pullen. Wird ein Push abgelehnt, ist die Antwort immer `git pull --rebase`, niemals `git push --force`.

`git status` vor jedem `git add` lesen: `git add -A` nimmt auch Exporte, Testbilder und Notizen mit, die gerade im Verzeichnis liegen.

Bei Umbauten an Login, Auth oder Datenstruktur besser über Branch plus Pull Request gehen. Netlify baut dazu automatisch eine Deploy-Preview, dort testen statt live.

## Aufbau

- `index.html`, `mitarbeiter.html` – Seiten
- `js/` – Frontend
- `netlify/functions/` – Backend: Login, Schichten, Aufgaben, Stats, Tracking
- `netlify/functions/lib/` – geteilte Helfer
- `attractions/`, `bands/`, `gallery/`, `exports/` – Inhalte und Assets

Daten liegen in **Netlify Blobs**, es gibt keine klassische Datenbank.

Key-Konvention beim Ausbau des Helferbereichs:
- Einzel-Entität: `<typ>-<id>` (z. B. `area-<id>`, `user-<email>`)
- Index/Liste: `<typ>s-index` (z. B. `areas-index`, `users-index`)
- Gecappte globale Aggregate: `<typ>-all` mit `.slice(-N)` (etabliert bei `shifts-all`)

## Lokal starten

```
npm install
npx netlify dev   # Seite plus Functions auf http://localhost:8888
```

Ohne `netlify dev` laufen die Functions und der Mitarbeiterbereich nicht.

## Secrets

Produktiv-Secrets stehen ausschließlich in den Netlify-Environment-Variablen, nie im Repo.
Lokal: `.env.example` nach `.env` kopieren und eigene Testwerte eintragen. `.env` ist gitignored.

Variablen: `STAFF_JWT_SECRET`, `STAFF_INVITE_CODE`, `STAFF_ADMIN_EMAILS`, `STATS_JWT_SECRET`, `STATS_PASSWORD`

## Stil

- Deutsche Texte mit echten Umlauten.
- In Seitentexten keine Geviertstriche, stattdessen Komma, Doppelpunkt oder Punkt.
- Bestehenden Look nachbauen, kein eigenes Design-System einführen.
