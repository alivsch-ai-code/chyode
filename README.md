# 🧳 Reiseplaner

Web-App, mit der eine geschlossene Gruppe gemeinsam Reisen plant: Wochenenden auswählen und
abstimmen, Wünsche notieren, Ideen für die Berge entdecken und passende Unterkünfte
(Booking.com / Airbnb via RapidAPI) vorgeschlagen bekommen.

## Projektstruktur

```
/backend    Node.js + Express + TypeScript REST-API (PostgreSQL)
/frontend   Next.js (App Router) + TailwindCSS + SWR
/shared     Gemeinsame TypeScript-Typen für Backend & Frontend
/database   SQL-Schema und Migrationen (PostgreSQL)
/docker     Dockerfiles für Backend & Frontend
/docs       API-Dokumentation
/infra      Referenz-Konfiguration des Produktionsservers (Nginx, Dashboard, SSH)
```

## User-Flow

1. Interessenten **registrieren** sich selbst (Name, E-Mail, Passwort) und bestätigen ihre
   Adresse per Mail-Link – danach ist das Konto sofort nutzbar. Alternativ lädt ein
   **Administrator** Personen per E-Mail ein (persönlicher Link, 7 Tage gültig, einmalig).
   Die Selbstregistrierung lässt sich mit `REGISTRATION_ENABLED=false` abschalten.
2. Passwort vergessen? Über „Passwort vergessen“ kommt ein Reset-Link per E-Mail.
3. Jedes Konto kann **Reisen erstellen** (Titel, Ort, Art, Budget) und dafür im
   **Wochenend-Picker** gezielt Wochenenden auswählen (Fr–So, Sa–So, Do–So, Fr–Mo; bundesweite
   Feiertage werden markiert). Der Einladungslink der Reise wird mit der Gruppe geteilt.
4. Mitglieder stimmen über Termine ab (inkl. Personenanzahl) – oder schlagen im **Kalender** (mit
   Kalenderwochen) einen eigenen Zeitraum vor – und geben ihre **Präferenzen** an: Höchstbudget
   für Übernachtung und Aktivitäten, gewünschte Erlebnisse und Unterkunftsarten. Dazu kommen
   Notizen mit Wünschen und Ideen.
5. Die **Auswertung** (Favorit, Budget-Statistik mit Median/Durchschnitt/Min/Max, Erlebnis- und
   Unterkunftswünsche) sieht der Ersteller sofort, Teilnehmer erst, wenn er sie **freigibt**.
   Sobald das Ergebnis freigegeben ist und alle abgestimmt haben, bekommen alle eine E-Mail.
6. Der Ersteller startet die **Unterkunftssuche** oder trägt die bereits gebuchte Unterkunft fest
   ein (Name, Adresse, Bewertung, Ausstattung, Link, Gesamtpreis) – sichtbar für alle, auch vor
   der Freigabe. Jedes Mitglied kann außerdem eine **eigene Unterkunft vorschlagen** (manuell,
   ganz ohne Booking.com/Airbnb); der Ersteller übernimmt einen Vorschlag mit einem Klick.
7. Vor Ort helfen mehrere Tabs: eine gemeinsame **Einkaufsliste** (gruppiert nach Mahlzeit, mit
   Wunschliste – „ich kaufe das“), gesammelte **Aktivitäten** in der Nähe (Kategorie, Entfernung,
   Dauer, Preis, Link) und eine **Kasse**: abgehakte Einkäufe, Unterkunftskosten und manuelle
   Ausgaben (optional mit eingescanntem Beleg) fließen automatisch zusammen, die App rechnet live
   aus, wer wem wie viel schuldet, und schlägt die wenigsten nötigen Zahlungen zum Ausgleichen vor.
   Ein Tab mit kuratierten **Berg-Ideen** (nach Jahreszeit und Wünschen sortiert, mit
   Google-Maps-Links) liefert zusätzliche Inspiration.
8. Jede Reise läuft in einem von zwei **Modi**: „Wir stimmen noch ab“ oder „Ist schon gebucht“
   (Planung) – der Ersteller kann jederzeit wechseln. Im Planungsmodus treten Termine,
   Präferenzen und Ergebnis in den Hintergrund, Unterkunft/Essen/Aktivitäten/Kasse stehen vorn.

## Datenschutz

Datensparsam by Design: kein Tracking, kein Zugriffsprotokoll mit IP-Adressen, nur ein technisch
notwendiger Sitzungs-Cookie. Reisedaten werden automatisch gelöscht (Standard: 7 Tage nach Ende
der Abstimmung bzw. nach dem tatsächlichen Reiseende, oder sofort sobald alle Schulden in der
Kasse beglichen sind; spätestens 90 Tage nach dem Erstellen); Reise und Konto lassen sich
jederzeit selbst löschen. Details: Seite `/datenschutz`, Konfiguration:
[docs/CONFIGURATION.md](docs/CONFIGURATION.md), Tests: [tests/README.md](tests/README.md).

## Erster Start (Administrator anlegen)

Der erste Administrator entsteht per Skript. Variante A: sich zuerst normal registrieren und das
Konto dann befördern:

```bash
docker compose exec backend node dist/scripts/bootstrap-admin.js admin@example.com --promote-only
```

Variante B: eine Admin-Einladung erzeugen (existiert die E-Mail schon, wird das Konto zum Admin
befördert und bekommt einen Passwort-Setz-Link):

```bash
docker compose exec backend node dist/scripts/bootstrap-admin.js admin@example.com "Vorname Nachname"
```

Das Skript gibt einen Link zum Festlegen des Passworts aus und verschickt ihn per E-Mail
(sofern SMTP konfiguriert ist). SMTP testen:

```bash
docker compose exec backend node dist/scripts/send-test-mail.js empfaenger@example.com
```

## Lokales Setup

### Voraussetzungen
- Node.js ≥ 20
- PostgreSQL ≥ 14 (lokal oder via Docker)

### 1. Datenbank

```bash
createdb tripplanner
psql -U postgres -d tripplanner -f database/schema.sql
```

Bestehende Installationen aktualisieren die Datenbank mit den Dateien in
`database/migrations/` (idempotent, additiv), z. B.:

```bash
docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/002_accounts.sql
```

### 2. Backend

```bash
cd backend
# backend/.env anlegen (Variablen siehe docs/CONFIGURATION.md)
npm install
npm run dev             # http://localhost:4000
```

Ohne `SMTP_USER`/`SMTP_PASS` werden E-Mails nur ins Log geschrieben. In Produktion
(`NODE_ENV=production`) ist ein `JWT_SECRET` mit mindestens 32 zufälligen Zeichen Pflicht.

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # http://localhost:3000
```

Der Login-Cookie funktioniert lokal, weil Frontend (Port 3000) und API (Port 4000) auf
`localhost` liegen. In Produktion laufen beide unter derselben Domain (Reverse Proxy: `/` →
Frontend, `/api` → Backend).

### 4. Alles zusammen mit Docker

```bash
# .env neben docker-compose.yml anlegen: JWT_SECRET (Pflicht), Domain, SMTP-Zugang
# (Variablen und Beispiel siehe docs/CONFIGURATION.md)
docker compose up --build
```

Startet PostgreSQL (inkl. Schema-Import), Backend (Port 4000) und Frontend (Port 3000), beide
nur an `127.0.0.1` gebunden. `NEXT_PUBLIC_API_URL` wird beim **Build** eingebrannt – nach einer
Änderung das Frontend neu bauen (`docker compose up --build -d frontend`).

## E-Mail-Versand (IONOS)

Einladungen und Passwort-Resets werden über ein IONOS-Postfach versendet (`smtp.ionos.de`,
Port 587/STARTTLS). Die Zugangsdaten gehören ausschließlich in die `.env` auf dem Server – nie
ins Repository. Einrichtung, Variablen und Test: [docs/CONFIGURATION.md](docs/CONFIGURATION.md).

## Externe APIs (optional)

Ohne gesetzte Keys laufen Booking.com/Airbnb-Suche mit Beispieldaten (die Oberfläche weist
darauf hin). Für echte Ergebnisse in der `.env` setzen:

- `RAPIDAPI_KEY` — für Booking.com- und Airbnb-Suche über RapidAPI
- `GOOGLE_MAPS_API_KEY` — für Distanzberechnung (Distance Matrix API)

## App installieren (PWA)

Die Seite lässt sich auf dem Startbildschirm installieren: auf Android/Chrome erscheint dafür
automatisch ein Hinweis mit „App installieren“, auf iPhone/iPad eine Anleitung zum manuellen
Hinzufügen über das Teilen-Menü (iOS unterstützt keinen automatischen Install-Dialog). Grundlage
sind `frontend/src/app/manifest.ts` und die Icons in `frontend/public/icons/`. Ändert sich das
Logo, lassen sich die Icons neu erzeugen mit:

```bash
cd frontend
npm install --no-save sharp   # nur fürs Skript, keine Laufzeit-Abhängigkeit
node scripts/generate-icons.js
```

## Rechtliches

`/impressum` und `/datenschutz` sind **Vorlagen mit Platzhaltern** und müssen vor dem Livegang
vom Betreiber ausgefüllt und geprüft werden.

## Dokumentation

- [docs/CONFIGURATION.md](docs/CONFIGURATION.md) — Umgebungsvariablen, Docker-`.env`, IONOS-Mail
- [docs/API.md](docs/API.md) — alle Endpoints inkl. Beispiel-Payloads

## Datenbankschema

Siehe [database/schema.sql](database/schema.sql) — Tabellen: `users`, `user_invites`,
`password_resets`, `trips`, `trip_users`, `date_options`, `votes`, `notes`,
`search_results_cache`.
