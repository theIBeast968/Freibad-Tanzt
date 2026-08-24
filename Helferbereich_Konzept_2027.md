# Konzept: Helfer- & Organisationsbereich "s'Freibad tanzt" 2027

**Adressat:** Sven Deschner (Umsetzung der Homepage/App)
**Auftraggeber:** Tobias Rath (Verein der Freibadfreunde Langenburg e.V.)
**Zweck dieses Dokuments:** Fachliche/inhaltliche Vorgabe für die Konzeption und den Bau des passwortgeschützten Helfer- und Organisationsbereichs auf freibad-tanzt.de. Dieses Dokument beschreibt WAS gebraucht wird, nicht WIE es technisch umgesetzt wird – die technische Umsetzung liegt bei Sven.

**Ziel-Launch der App:** 01.09.2026
**Festivaltermin 2027:** Wochenende um den 20.06.2027 (Fr/Sa Party, So 50-Jahr-Feier Freibad)

---

## 1. Projektüberblick & Ziel

"s'Freibad tanzt" ist ein ehrenamtlich organisiertes Techno/Open-Air-Festival am Freibad Langenburg, veranstaltet vom Verein der Freibadfreunde Langenburg e.V. Alle Erlöse fließen in den Erhalt des Freibads.

**2027 gibt es zwei zentrale Neuerungen gegenüber 2026:**

1. Der Sonntag ist kein normaler "Familientag" mehr, sondern die **50-Jahr-Feier des Freibads** – mit deutlich größerem Programm (Kirche, Ehrengäste aus Politik/Gemeinderat, gemeinsames Essen, Live-Band, Spiel & Spaß). Eintritt an diesem Tag frei, sowohl Freibad als auch Veranstaltung.
2. Die Organisation soll dezentralisiert werden. Tobias möchte sich 2027 primär auf seine Rolle als "Kopf" der Party-Abende Fr/Sa konzentrieren. Aufbau, Detailplanung, Durchführung und Abbau sollen eigenständig von mehreren Bereichsleitern mit ihren jeweiligen Helferteams laufen – koordiniert über die neue App statt über WhatsApp.

**Zusätzliches Ziel 2027:** Möglichst viele umliegende Vereine (FC Langenburg, TC Langenburg, TSV Langenburg, Volleyball etc.) einbinden – um Helfer zu gewinnen, Interesse in den Vereinen zu wecken, Gäste zu generieren und den Zusammenhalt in der Gemeinde zu stärken.

Die App ist damit das zentrale Werkzeug für die komplette interne Kommunikation, Organisation und Schichtplanung des Festivals.

---

## 2. Nutzerrollen & Rechte

Drei Rollen:

| Rolle | Wer | Kernrechte |
|---|---|---|
| **Admin** | Tobias Rath, Fritz, Sven | Vollzugriff auf alle Bereiche, alle Chats, alle Dashboards. Können Bereiche anlegen/bearbeiten, Bereichsleiter zuweisen, Helfer freischalten, Ankündigungen im großen Dashboard posten. |
| **Bereichsleiter** | Wird von Admin zugewiesen, pro Bereich mind. 1 Person | Volle Kontrolle über ihren eigenen Bereich: Bereichs-Dashboard bespielen (Ankündigungen, Umfragen, Aufgaben, Checklisten, Schichtpläne), Chats für ihren Bereich anlegen, eigene Helfer organisieren/freischalten. Kein Zugriff auf andere Bereiche. |
| **Helfer** | Meldet sich über Anmeldeformular an, wird einem oder mehreren Bereichen zugeordnet | Sieht und nutzt nur die Bereiche, denen er zugeordnet ist. Kann im Bereichs-Dashboard kommentieren (nicht posten). Kann in den Chats seines Bereichs posten, chatten, kommentieren. |

Alle drei Admins (Tobias, Fritz, Sven) haben identische, vollwertige Rechte – keine Abstufung.

Zusätzlich: **Admin-Bereich** – ein eigener, nur für die drei Admins sichtbarer Kanal für interne Abstimmung/Entscheidungen, der nicht Teil der normalen Bereichsstruktur ist.

---

## 3. Bereichsstruktur

**Wichtiges Grundprinzip: Die Bereichsstruktur ist dynamisch.** Es gibt zum Start eine Grundliste (angelehnt an die bewährten Bereiche aus 2026), aber neue Bereiche können jederzeit von Admins ergänzt werden. Die App muss das Anlegen neuer Bereiche als Standard-Admin-Funktion unterstützen, nicht als Sonderfall.

**Startliste der Bereiche (Beispiel, erweiterbar):**
- Getränke/Ausschank
- Essensstände (Fremdvergabe/Kooperation, z. B. Grillhäusle, Wraps)
- Kuchenteam (eigenständiger Bereich, bedient u. a. Kaffee & Kuchen am Sonntag)
- Bühne/Technik/Sound
- Security-Koordination (Schnittstelle zum externen Dienstleister)
- Aufbau/Logistik
- Camping
- Kasse/Ticketing
- Sanitär/Reinigung
- Presse/Social Media
- Kinderprogramm
- (weitere je nach Bedarf, z. B. Empfang/Ehrengäste-Betreuung für den Sonntag, falls sich das als eigenständiger Bereich herausstellt)

**Der Sonntag läuft zweistufig, da das Programm der 50-Jahr-Feier noch nicht feststeht:**

**Stufe 1 – Planungsbereich "Sonntag – 50 Jahre Freibad":**
Ein eigener, von Anfang an bestehender Bereich, der als Diskussions- und Entscheidungsraum dient. Hier wird geklärt:
- Was wird am Sonntag geboten (Programmpunkte: Kirche, Ehrengäste-Empfang, Bühne für Reden, gemeinsames Essen, Spiel & Spaß, etc.)
- Wie wird es geboten (grobe Umsetzung, Ablauf, wer könnte es übernehmen)

Dieser Bereich hat wie jeder andere Bereich einen Bereichsleiter (Koordination der Diskussion, Zusammenfassung der Ergebnisse), aber zunächst noch keine eigenen Schichtpläne – er ist in seiner ersten Phase reine Konzept-/Abstimmungsebene.

**Stufe 2 – Operative Bereiche (entstehen im Projektverlauf aus Stufe 1):**
Sobald ein Programmpunkt aus dem Planungsbereich konkret genug ist, wird daraus ein eigenständiger, normaler Bereich mit eigenem Bereichsleiter, eigenem Chat, eigenem Bereichs-Dashboard und eigenem Schichtplan (z. B. "Kirche/Programm", "Empfang & Ehrengäste", "Bühne Sonntag/Reden"). Diese neuen Bereiche funktionieren dann strukturell exakt wie jeder andere Bereich in der App (siehe Kapitel 2 und 6) – der Planungsbereich bleibt parallel bestehen für Themen, die noch nicht spruchreif sind.

Es gibt also keinen dauerhaften strukturellen Unterschied zwischen einem "Fr/Sa-Bereich" und einem aus dem Sonntag-Planungsbereich entstandenen operativen Bereich – nur der Planungsbereich selbst ist ein Sonderfall (Diskussionsraum ohne eigene Schichten, aus dem sich neue Bereiche ausgliedern).

**Herkunft der Helfer statt eigener Vereinskanäle:** Externe Vereine bekommen keine eigenen Kanäle. Stattdessen wird bei der Helferanmeldung ein Dropdown-Feld "Herkunft" abgefragt:

> Freiwilliger Helfer, Freibadfreunde, Orga Team, Bauwagen, FC Langenburg, TC Langenburg, TSV Langenburg, Volleyball, ... (Liste muss durch Admin erweiterbar sein)

Vereinsmitglieder werden dadurch ganz normal einem inhaltlichen Bereich zugeordnet (z. B. ein FC-Langenburg-Helfer im Bereich Getränke), die Herkunft ist nur ein Attribut zur Auswertung/Übersicht für die Admins.

---

## 4. Dashboard-Konzept

Zwei Ebenen:

**A) Großes Dashboard (Startseite nach Login)**
- Postrecht: nur Admin und Presseverantwortlicher
- Inhalt: ausschließlich Ankündigungen und Umfragen (kein operatives Tagesgeschäft)
- Sichtbar für: alle eingeloggten Nutzer (Admin, alle Bereichsleiter, alle Helfer)

**B) Bereichs-Dashboard (pro Bereich)**
- Postrecht: nur der jeweilige Bereichsleiter
- Kommentarrecht: Helfer des Bereichs
- Inhalt: Ankündigungen, Umfragen, Aufgaben, Checklisten, Schichtpläne
- Sichtbar für: nur Admins + die diesem Bereich zugeordneten Helfer/Bereichsleiter

---

## 5. Chat-System

- Jeder Bereich hat mindestens einen eigenen Chat, den der Bereichsleiter anlegt und verwaltet
- In diesen Chats dürfen alle Helfer des jeweiligen Bereichs posten, chatten, kommentieren
- Bereiche sind strikt voneinander getrennt: ein Helfer im Bereich Getränke sieht keine Chats/Infos aus dem Bereich Bühne (bewusst, um Informationsflut zu vermeiden)
- Admins sehen und können in allen Bereichs-Chats mitlesen (voller Zugriff, siehe Kapitel 2)
- Zusätzlich: separater Admin-Chat/Bereich nur für Tobias, Fritz, Sven

---

## 6. Schichtplan-Modul

**Kernprinzip: Ein Bereich kann mehrere Schichtplan-Typen (Phasen) parallel haben.** Eine Aufbauschicht ist inhaltlich und zeitlich nicht vergleichbar mit einer Betriebsschicht – deshalb keine einheitliche Schicht-Logik über alle Phasen, sondern getrennte Pläne pro Phase innerhalb eines Bereichs.

**Phasen:**
1. **Aufbau** (eigener Zeitraum vor dem Fest)
2. **Freitag-Betrieb**
3. **Samstag-Betrieb** (strukturell ähnlich zu Freitag)
4. **Sonntag-Betrieb** (eigenständige Logik: Beginn bereits 10:00 Uhr statt abends, mehr/andere Stationen wegen 50-Jahr-Programm, Programm steht noch nicht final fest → Schichten müssen jederzeit erweiterbar/veränderbar sein). Bestehende Bereiche (z. B. Getränke, Kuchenteam) planen ihre Sonntag-Schicht wie gewohnt in dieser Phase. Für neue Programmpunkte der 50-Jahr-Feier gilt: Schichtpläne entstehen erst, sobald aus dem Planungsbereich "Sonntag – 50 Jahre Freibad" (siehe Kapitel 3) ein eigenständiger operativer Bereich ausgegliedert wurde – der Planungsbereich selbst führt keine eigenen Schichten.
5. **Abbau** (eigener Zeitraum nach dem Fest)

Ein Bereich wählt aus, in welchen Phasen er aktiv ist, und legt für jede aktive Phase eigene Schichten/Stationen an.

**Einheitliches Grundgerüst pro Schicht** (damit Admins bereichsübergreifend eine Gesamtübersicht haben):
- Datum
- Uhrzeit (von/bis)
- Bereich
- Phase
- Station/Aufgabe (Freitext, wichtig für Sonntag mit vielen Stationen)
- Anzahl benötigter Helfer
- Status (offen/besetzt/teilweise besetzt)

**Zusatzfelder pro Bereich möglich** (bereichsspezifisch, optional): z. B. Aufbau könnte "Werkzeug/Fahrzeug nötig" brauchen, Ausschank könnte "Kassenzuordnung" brauchen. Die App sollte es Bereichsleitern erlauben, solche Zusatzfelder pro Schicht selbst zu ergänzen, ohne dass das Grundgerüst verändert wird.

---

## 7. Helfer-Registrierung & Freischaltung

- Anmeldung über ein Formular (ähnliches Prinzip wie das bestehende Bereichsleiter-Bewerbungsformular)
- Pflichtfelder: Name, Kontakt, gewünschter Bereich (ggf. Zweitwunsch), Herkunft (Dropdown, siehe Kapitel 3)
- DSGVO-Consent ist Pflicht (siehe Kapitel 10)
- Freischaltung erfolgt durch den zuständigen Bereichsleiter (dezentral, nicht zentral über Tobias) – Bereichsleiter dürfen ihre Helfer selbst organisieren und freischalten
- Admins können jederzeit übersteuern/zusätzlich freischalten

---

## 8. Chatbot

Zwei getrennte, reine Frage-Antwort-Chatbots auf Basis der Claude API (mit hinterlegter Wissensbasis, kein aktives Mitlesen/Reagieren in den Chats):

**A) Öffentlicher Bot** (auf der normalen, öffentlichen Homepage freibad-tanzt.de)
- Zielgruppe: Festivalgäste
- Themen: Programm, Zeiten, Tickets, Anfahrt, Camping, Sonntagsprogramm/50-Jahr-Feier
- Wissensbasis: öffentliche Seiteninhalte

**B) Interner Bot** (im passwortgeschützten Helferbereich)
- Zielgruppe: Helfer, Bereichsleiter
- Themen: Schichtplan, Bereichsanweisungen, Ansprechpartner, Seepferdchen Brechchips, Anfahrt/Parken für Helfer
- Wissensbasis: Bereichsanweisungen + Archivwissen, gepflegt/ergänzt durch die jeweiligen Bereichsleiter

---

## 9. Push-Benachrichtigungen

- Push-Benachrichtigungen sind erforderlich (kein reines "beim Login sehen")
- Sollten mindestens greifen bei: neue Ankündigung im großen Dashboard, neue Ankündigung im eigenen Bereichs-Dashboard, neue Nachricht im eigenen Bereichs-Chat
- Genaue Feinsteuerung (z. B. Ein-/Ausschaltbarkeit pro Kanal) liegt im Ermessen von Sven bei der Umsetzung

---

## 10. Datenschutz & Einwilligung

- Beim Erstlogin ist eine **Pflicht-Sammel-Consent-Box** erforderlich, die sowohl allgemeine Daten (Name, Kontakt, Chat-Inhalte) als auch Foto/Video-Material gemeinsam abdeckt – keine getrennten Checkboxen
- Inhaltlich sinngemäß: Einwilligung, dass eingegebene Daten (inkl. ggf. geteilter Fotos/Videos) zum Zweck der Festivalorganisation gespeichert werden und von Admins/Bereichsleitung eingesehen werden können
- Die Admin-Einsicht in alle Bereiche muss in der Datenschutzerklärung transparent benannt werden
- Löschkonzept: Daten werden nach Saisonende gelöscht bzw. zurückgesetzt, spätestens vor Start der nächsten Bewerbungsrunde
- Keine sensiblen Daten (z. B. Gesundheitsdaten) über die App erfassen – als Hinweis in die Nutzungsregeln aufnehmen

---

## 11. Technische Rahmenbedingungen

- Umsetzung als Web-App (PWA-Ansatz empfohlen, aber technische Entscheidung liegt bei Sven), eingebunden unter freibad-tanzt.de, geschützter Login-Bereich
- Bestehendes Bewerbungsformular nutzt aktuell Google Apps Script + Google Sheets als Backend. Für den deutlich umfangreicheren Funktionsumfang dieser App (Chats, Dashboards, Schichtpläne, Rollen, Push) wird eine echte Datenbank-Lösung empfohlen – Entscheidung über konkrete Technologie liegt bei Sven
- App soll technisch/strukturell **unabhängig davon starten können, ob alle Bereichsleiter-Posten bereits besetzt sind**. Admins müssen Bereiche und deren Leiter jederzeit nachträglich anlegen/ändern können
- Corporate Design (Farben, Optik) ist bewusst **nicht** Teil dieses Konzepts – wird separat von Sven festgelegt, sobald das CD 2027 entschieden ist

---

## 12. Nicht-Ziele / bewusst ausgeklammert

Damit beim Bauen kein Scope-Creep entsteht – folgendes ist explizit NICHT Teil dieses Konzepts:

- Corporate Design / visuelle Gestaltung (liegt bei Sven, unabhängig von diesem Dokument)
- Aktiv mitlesender/reagierender Chatbot in den Chats (Bots sind reine Frage-Antwort-Systeme, kein Bestandteil der Chat-Threads selbst)
- Eigene Kanäle pro externem Verein (stattdessen: Herkunfts-Dropdown, siehe Kapitel 3)
- Ein fixer, von Beginn an vollständiger Sonntags-Bereichskatalog (die operativen Sonntag-Bereiche entstehen erst nach und nach aus dem Planungsbereich, siehe Kapitel 3 und 6)
- Ticketing/Bezahlsystem (läuft weiterhin separat über Eventfrog, nicht Teil dieser App)
- Granulare Einzel-Consent-Checkboxen (bewusst eine Sammel-Box, siehe Kapitel 10)

---

*Erstellt für Sven Deschner als Konzeptgrundlage zur Umsetzung mit Claude Code. Rückfragen an Tobias Rath.*
