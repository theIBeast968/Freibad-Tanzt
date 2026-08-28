# Übergabe

Technische Übergabe für eine neue Claude-Code-Session auf einem anderen Rechner. Ergänzt `CLAUDE.md` (Regeln) und `Status.md` (aktueller Stand) um Kontext und Fallstricke, die sonst nur in Chatverläufen stecken würden.

## Projektbeteiligte

- **Tobias Rath** (`tobirki@gmx.net`) – Projektinhaber, Verein der Freibadfreunde Langenburg e.V.
- **Sven** – setzt die Homepage/App technisch um, besitzt den **Netlify-Account/Team**, unter dem das Projekt `freibadtanzt` läuft. Das ist wichtig: der Projektinhaber selbst hat **keinen** Netlify-Zugriff.
- **Fritz** – dritter Admin im Helferbereich (laut `Helferbereich_Konzept_2027.md`).

## Architektur in Kürze

Statische Seite (`index.html`, `mitarbeiter.html`) plus Netlify Functions (`netlify/functions/`) als Backend, Daten in Netlify Blobs (kein klassisches DB). Kein Build-Step außer `npm install`. Details und Konventionen stehen in `CLAUDE.md` – die gelten uneingeschränkt weiter.

Der Helferbereich (`mitarbeiter.html` + `js/mitarbeiter/`) ist deutlich gewachsen: Rollen (Admin/Bereichsleiter/Helfer), dynamische Bereichsstruktur, Schichtplanung, Chat (bereichsweise + Admin-intern), Dashboard-Beiträge mit Medien-Upload, Push-Benachrichtigungen, Inaktivitäts-Workflow, öffentlicher und interner Chatbot (Claude API über `netlify/functions/lib/claude.js`). Die fachliche Zielvorstellung für 2027 steht in `Helferbereich_Konzept_2027.md` – das ist ein Anforderungsdokument von Tobias an Sven, nicht zwingend 1:1 umgesetzt. Vor Weiterarbeit daran den Ist-Stand im Code gegen das Konzept prüfen.

## Was in der letzten Session passiert ist

Zwei parallele Change-Sets wurden zusammengeführt:

1. **Helferbereich-Ausbau** (PR #2, `feature/bereiche-rollen`) – von einer anderen Session bearbeitet, lief parallel im selben Ordner.
2. **"Ready for 2027"-Homepage-Umbau + Fotogalerie** (PR #1, `feature/2027-banner`) – Gegenstand dieser Session: Saisonende-Banner, alte 2026-Inhalte ausgeblendet statt gelöscht, Fotogalerie auf Jahres-Rückblicke umgebaut.

Beide sind gemerged. Details zum PR-#1-Inhalt: Timetable/Tickets/Eintrittspreise/FAQ stecken per `hidden`-Attribut im DOM, aber unsichtbar; ein CSS-Override `[hidden]{display:none!important}` in `styles.css` ist nötig, weil die bestehenden `.timetable-grid`/`.ticket-stage`-Klassen `display:grid` setzen und das native `[hidden]`-Verhalten sonst überschreiben würden (author-CSS schlägt UA-Stylesheet immer, unabhängig von Spezifität). Bei künftigen "ausblenden statt löschen"-Aufgaben in diesem Repo an dieses Muster denken.

## Fallstricke, auf die man sonst wieder reinfällt

### 1. Netlify-Zugriff fehlt, wenn ein Deploy-Check rot ist

GitHub zeigt bei einem fehlgeschlagenen Netlify-Check nur "Deploy failed, check logs" – nie den echten Fehlertext. Weder `gh` CLI noch die GitHub-API liefern mehr Detail, weil der Log bei Netlify liegt. Der Netlify-Account des Projektinhabers hat keinen Zugriff auf das `freibadtanzt`-Projekt (bestätigt: `netlify sites:list` zeigt nur 4 fremde Projekte). Optionen, wenn das wieder auftritt:

- **Zuerst lokal ausschließen, dass es Code ist:** `npx @netlify/zip-it-and-ship-it netlify/functions <out-dir>` bundelt die Functions genau wie Netlifys Build. Läuft das fehlerfrei durch (und lief `netlify dev` vorher schon anstandslos), ist es sehr wahrscheinlich ein Netlify-seitiges Konfigurationsproblem, kein Code-Bug – das war bei zwei von zwei Vorfällen in diesem Repo der Fall.
- **Dann Sven fragen:** entweder er schaut selbst rein und ändert etwas in der Netlify-Konfiguration, oder er lädt `tobirki@gmx.net` als Mitglied seines Netlify-Teams ein.
- **Wichtig:** Ein reiner Konfigurations-Fix bei Sven triggert den bestehenden PR-Check NICHT automatisch neu. Es braucht danach einen neuen Push (notfalls `git commit --allow-empty -m "Netlify-Deploy neu anstossen" && git push`), damit der Check neu läuft.

### 2. `netlify-cli` per `npx` ist auf diesem Windows-Setup unzuverlässig

`npx netlify-cli login` ist mehrfach mit `TypeError: Cannot set property name of which has only a getter` abgestürzt (evtl. Node-Versions-Kompatibilität, hier Node v24.18.1) und hat separat mit "Timed out waiting for authorization" abgebrochen, wenn zwischen Ticket-Erzeugung und Bestätigung im Browser zu viel Zeit verging. Falls nötig: Login-Befehl unmittelbar vor der erwarteten Bestätigung starten, nicht vorher schon fragen. Selbst nach erfolgreichem Login hilft das aber nichts, wenn der Account nicht Mitglied im richtigen Netlify-Team ist (siehe Punkt 1).

### 3. `gh` CLI ist nicht vorinstalliert

Wurde in dieser Session per `winget install --id GitHub.cli` nachinstalliert und per Device-Flow (`gh auth login --web`) authentifiziert. Auf einem neuen Rechner fehlt das wieder – siehe `Übergabe Readme.md`.

### 4. Parallele Sessions im selben Ordner

Wenn zwei Claude-Code-Sessions gleichzeitig am selben Repo arbeiten sollen (z. B. eine an Helferbereich-Code, eine an der Homepage), NICHT im selben Arbeitsverzeichnis parallel Branches wechseln oder Dateien anfassen – das überschreibt die unfertige Arbeit der anderen Session live auf der Festplatte. Stattdessen: `git worktree add ../<projektname>-<feature> -b <branch> origin/main` nutzen, um einen komplett separaten Ordner mit eigenem Checkout zu bekommen. Nach dem Merge mit `git worktree remove <pfad>` wieder aufräumen.

### 5. Gallery-Ordnerstruktur wurde während der Session doppelt angefasst

Beide parallelen Branches haben unabhängig voneinander die Fotos nach `gallery/<jahr>/` umsortiert – einmal korrekt mit neuer Jahres-Tab-Logik (PR #1), einmal nur mit angepassten Pfaden im alten Einzel-Array-System (PR #2), wobei letzteres versehentlich zwei themenfremde Fotos (Zeltparty im März) mit in die Festival-Galerie gemischt hätte. Beim Merge wurde bewusst die PR-#1-Version behalten. Falls nochmal an der Galerie gearbeitet wird: aktueller Stand ist `photoPath(year, filename)` + `galleryByYear`-Objekt in `index.html`, NICHT das alte `galleryFiles`-Flach-Array (falls das irgendwo in altem Code/Notizen auftaucht, ist es veraltet).

## Lokales Setup, das nicht mitwandert

- Git-Zugangsdaten/Credential-Manager für `github.com` (HTTPS-Push funktionierte ohne Passwort-Prompt, lief also über einen gespeicherten Credential-Helper).
- `gh auth login` und `netlify login` – beide account-/maschinengebunden, müssen auf dem neuen Rechner neu gemacht werden.
- Git-Identität: `user.name = Tobias Rath`, `user.email = tobirki@gmx.net`.
- Lokale `.env` (gitignored) mit Test-Secrets – siehe `.env.example` für die vollständige Liste inkl. `VAPID_*` und `ANTHROPIC_API_KEY`.
- Node v24.18.1 / npm 11.16.0 waren auf diesem Rechner installiert.

## Was NICHT mitwandert (und auch nicht muss)

Das Auto-Memory-System von Claude Code (`~/.claude/projects/.../memory/`) ist an diesen Rechner und dieses Konto gebunden und geht mit der Kontokündigung verloren. Alles darin, was noch relevant war, ist in diese drei Dateien (`CLAUDE.md`, `Status.md`, `Uebergabe.md`) übernommen worden. Eine neue Session muss diese Dateien lesen, nicht auf altes Memory hoffen.
