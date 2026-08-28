# Übergabe Readme

Kurzanleitung für den Start auf dem neuen Rechner mit einem neuen Claude-Code-Konto.

## 1. Repo klonen

```bash
git clone https://github.com/theIBeast968/Freibad-Tanzt.git
cd Freibad-Tanzt
```

Falls Git noch nicht eingerichtet ist:

```bash
git config --global user.name "Tobias Rath"
git config --global user.email "tobirki@gmx.net"
```

Beim ersten `git push` fragt Git nach GitHub-Zugangsdaten (Browser-Login oder Personal Access Token) – einmalig, danach merkt sich das der Credential-Manager.

## 2. Abhängigkeiten installieren

```bash
npm install
```

## 3. Lokale Test-Umgebung anlegen

```bash
cp .env.example .env
```

Danach `.env` öffnen und eigene Testwerte eintragen (nicht die Produktiv-Secrets, die stehen nur in Netlify). Reicht für lokales Testen mit `npx netlify dev`.

## 4. Neue Claude-Code-Session starten

Claude Code im Projektordner starten und als **erste Nachricht** genau das hier schreiben:

> Lies bitte CLAUDE.md, Status.md und Uebergabe.md, bevor wir anfangen.

Diese drei Dateien enthalten alles, was aus der vorherigen Session wichtig ist – Projektregeln, aktueller Stand, bekannte Fallstricke. Das alte Claude-Konto und dessen Memory gehen mit der Kündigung verloren, deshalb steht der komplette Kontext jetzt im Repo statt im Konto.

## 5. Optional: GitHub CLI und Netlify CLI

Nur nötig, falls die neue Session PRs erstellen/mergen oder Netlify-Logs einsehen soll:

```bash
winget install --id GitHub.cli
gh auth login --web
```

Für Netlify-Zugriff: Sven muss `tobirki@gmx.net` (oder die neue Konto-Mail) erst als Mitglied seines Netlify-Teams einladen – ohne das läuft man in dieselbe Sackgasse wie in der letzten Session (siehe `Uebergabe.md`, Abschnitt "Fallstricke").

## Risiken bei der Übertragung

- **Kein Datenverlust im Code:** Der komplette Projektstand liegt in Git (GitHub), das ist unabhängig vom Claude-Konto. Ein `git clone` auf dem neuen Rechner holt alles.
- **Verloren geht:** das Auto-Memory dieses Claude-Kontos (Gesprächsverlauf, gelernte Vorlieben/Fallstricke) – deshalb dieser Satz an Übergabedokumenten.
- **Verloren geht ebenfalls:** lokal gespeicherte Logins (`gh`, `netlify-cli`, evtl. Git-Credential-Cache) – müssen auf dem neuen Rechner neu eingerichtet werden, sind aber nicht sicherheitskritisch verknüpft mit dem Claude-Konto selbst.
- **Nicht betroffen:** Produktiv-Secrets und der Netlify-Account – die liegen ohnehin nicht bei Claude, sondern bei Netlify/Sven bzw. in den Netlify-Environment-Variablen.
