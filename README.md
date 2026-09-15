# 🧳 Gruppen-Reiseplaner

Web-App, mit der eine Gruppe gemeinsam eine Reise planen kann: Trip erstellen, Einladungslink
teilen, Termine voten, Wünsche notieren – und automatisch passende Unterkünfte (Booking.com /
Airbnb via RapidAPI) vorgeschlagen bekommen.

## Projektstruktur

```
/backend    Node.js + Express + TypeScript REST-API (PostgreSQL)
/frontend   Next.js (App Router) + TailwindCSS + SWR
/shared     Gemeinsame TypeScript-Typen für Backend & Frontend
/database   SQL-Schema (PostgreSQL)
/docker     Dockerfiles für Backend & Frontend
/docs       API-Dokumentation
```

## User-Flow

1. **Ersteller** meldet sich per Magic-Link an und erstellt einen Trip (Titel, Ort, Reiseart,
   Terminoptionen, Budget) → erhält einen Einladungslink.
2. **Teilnehmer** öffnen den Link, geben nur ihren Namen ein (kein Passwort) und können:
   - für Termine/Wochenenden abstimmen (inkl. Personenanzahl)
   - Wünsche/Notizen hinterlassen (z.B. "Sauna", "3 Schlafzimmer")
3. Der Ersteller schließt das Voting und startet die **automatische Unterkunftssuche** —
   die App durchsucht Booking.com & Airbnb, bewertet die Treffer nach Budget, Bewertung,
   Entfernung und Gruppenwünschen und zeigt die Top-3-Vorschläge.

## Lokales Setup

### Voraussetzungen
- Node.js ≥ 20
- PostgreSQL ≥ 14 (lokal oder via Docker)

### 1. Datenbank

```bash
createdb tripplanner
psql -U postgres -d tripplanner -f database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # DATABASE_URL, JWT_SECRET etc. anpassen
npm install
npm run dev             # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # http://localhost:3000
```

### 4. Alles zusammen mit Docker

```bash
docker compose up --build
```

Startet PostgreSQL (inkl. Schema-Import), Backend (Port 4000) und Frontend (Port 3000).

## Externe APIs (optional)

Ohne gesetzte Keys laufen Booking.com/Airbnb-Suche mit deterministischen Mock-Daten, damit die
App auch ohne Zugangsdaten sofort lauffähig ist. Für echte Ergebnisse in `backend/.env` setzen:

- `RAPIDAPI_KEY` — für Booking.com- und Airbnb-Suche über RapidAPI
- `GOOGLE_MAPS_API_KEY` — für Distanzberechnung (Distance Matrix API)

## API-Dokumentation

Siehe [docs/API.md](docs/API.md) für alle Endpoints inkl. Beispiel-Payloads.

## Datenbankschema

Siehe [database/schema.sql](database/schema.sql) — Tabellen: `users`, `trips`, `trip_users`,
`date_options`, `votes`, `notes`, `search_results_cache`.
