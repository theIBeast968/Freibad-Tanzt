# Status

Stand: 2026-08-24. Momentaufnahme des Projekts, kein Ersatz für `git log`.

## Live-Zustand

`main` ist deployt auf freibad-tanzt.de. Zuletzt gemergt:

- **PR #2** (`feature/bereiche-rollen`): Helferbereich-Ausbau – Registrierung/Freischaltung neu, Schicht-Bewerbung, Bereichsleiter-Rollen, Dashboard-Beiträge mit Foto/Video-Upload, Inaktivitäts-Workflow, Chatbot (öffentlich + intern), Barrierefreiheits-Audit-Fixes.
- **PR #1** (`feature/2027-banner`): Homepage auf Saisonende umgestellt ("Ready for 2027") + Fotogalerie neu (Jahres-Tabs, Slideshow, Album-Ansicht).

Beide PRs sind gemerged, `main` ist aktuell (Commit `56186c2`).

## Was die Homepage gerade zeigt

- Saison 2026 ist vorbei. Timetable, Ticket-Verkauf, Eintrittspreise und FAQ sind **ausgeblendet** (nicht gelöscht, `hidden`-Attribut), stattdessen ein "Ready for 2027"-Banner. Termin für 2027 steht laut Website noch nicht fest.
- Fotogalerie zeigt zwei Rückblick-Tabs: 2025 (voll, 30 Fotos) und 2026 (aktuell 1 Foto, `IMG_4164.JPG`). Struktur: `gallery/<jahr>/<datei>`.
- Zwei Dateien (`PHOTO-2026-03-11-*.jpg`, liegen in `gallery/2025/`) sind bewusst **nicht** in der Galerie gelistet – andere Veranstaltung (Zeltparty im März), nicht das Festival.

## Offene Punkte / nächste Schritte

- **2026er-Festivalfotos ergänzen:** sobald mehr Fotos vorliegen, in `gallery/2026/` ablegen und in `index.html` im Array `galleryByYear['2026']` eintragen (im Gallery-Skript, Suche nach `photoPath`).
- **Termin 2027:** laut `Helferbereich_Konzept_2027.md` ist intern ein Termin um den 20.06.2027 angedacht (Fr/Sa Party, So 50-Jahr-Feier des Freibads) – auf der Homepage aber bewusst noch nicht kommuniziert, bis er offiziell feststeht. Wenn der Termin fix ist: Banner-Texte in `index.html` (Suche nach "Ready for 2027") aktualisieren und die ausgeblendeten Sektionen (Timetable, Tickets, Eintritt, FAQ) wieder einblenden/aktualisieren.
- **Helferbereich-Konzept 2027** (`Helferbereich_Konzept_2027.md`) beschreibt einen deutlich größeren Ausbau (dynamische Bereichsstruktur, Bereichsleiter-Rollen, Admin-Bereich, Zielsystem u. a.) – Stand dieses Dokuments mit dem tatsächlichen Umsetzungsstand in `netlify/functions/` abgleichen, bevor daran weitergearbeitet wird.

## Bekannte Stolpersteine (siehe `Uebergabe.md` für Details)

- Netlify-Projekt läuft unter Svens Account – fehlgeschlagene Deploy-Checks sind für andere Accounts nicht einsehbar.
- `[hidden]`-Attribut wird von `display:grid/flex`-Klassen im bestehenden CSS überschrieben, außer mit explizitem `[hidden]{display:none!important}`-Override (steht schon in `styles.css`, aber wichtig bei neuen Sections).
- Lokale `.env` enthält nur Test-Secrets (`STAFF_INVITE_CODE=testcode` etc.) – Produktiv-Werte stehen ausschließlich in Netlifys Environment-Variablen.
