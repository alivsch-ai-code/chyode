# Konfiguration

Alle Einstellungen kommen aus Umgebungsvariablen. **Echte Werte gehören nie ins Repository** –
die Dateien `.env` (Repo-Wurzel, für Docker Compose) und `backend/.env` (lokale Entwicklung) sind
per `.gitignore` ausgeschlossen. Werte in spitzen Klammern (`<…>`) sind Platzhalter.

## Docker Compose (`.env` neben `docker-compose.yml`)

`docker compose` lädt die Datei automatisch. Beispiel (Platzhalter ersetzen):

```
NODE_ENV=production
FRONTEND_URL=https://<deine-domain>
NEXT_PUBLIC_API_URL=https://<deine-domain>/api

POSTGRES_PASSWORD=<datenbank-passwort>
JWT_SECRET=<zufaelliger-string-mind-32-zeichen>

SMTP_HOST=smtp.ionos.de
SMTP_PORT=587
SMTP_USER=<postfach-adresse>
SMTP_PASS=<app-passwort-des-postfachs>
MAIL_FROM=<postfach-adresse>
APP_NAME=Reiseplaner

RAPIDAPI_KEY=
GOOGLE_MAPS_API_KEY=
```

Ein `JWT_SECRET` erzeugst du z. B. mit `openssl rand -hex 32`. `NEXT_PUBLIC_API_URL` wird beim
**Build** des Frontends eingebrannt; nach einer Änderung `docker compose up --build -d frontend`.

## Variablen

| Variable | Pflicht | Standard | Bedeutung |
| --- | --- | --- | --- |
| `NODE_ENV` | – | `production` (Compose) | `production` aktiviert strengere Prüfungen und Secure-Cookies |
| `FRONTEND_URL` | ja | `http://localhost:3000` | Öffentliche Adresse der App; Basis für Links in E-Mails, CORS und Cookie-`Secure` (bei `https://`) |
| `NEXT_PUBLIC_API_URL` | ja | `http://localhost:4000/api` | API-Adresse, wie sie der Browser erreicht |
| `DATABASE_URL` | ja (Backend lokal) | – | PostgreSQL-Verbindung; in Compose aus `POSTGRES_PASSWORD` zusammengesetzt |
| `POSTGRES_PASSWORD` | – | `postgres` | Passwort des Datenbank-Containers – in Produktion ändern |
| `JWT_SECRET` | in Produktion | Dev-Wert nur außerhalb von Produktion | Signiert Sitzungen; mindestens 32 zufällige Zeichen |
| `SESSION_TTL_DAYS` | – | `7` | Gültigkeit der Anmeldung |
| `INVITE_TTL_DAYS` | – | `7` | Gültigkeit von Einladungslinks |
| `PASSWORD_RESET_TTL_MIN` | – | `60` | Gültigkeit von Reset-Links |
| `REGISTRATION_ENABLED` | – | `true` | `false` schließt die Selbstregistrierung (dann nur Einladungen) |
| `VERIFICATION_TTL_HOURS` | – | `24` | Gültigkeit des Bestätigungslinks der Registrierung |
| `REGISTRATION_HOURLY_LIMIT` | – | `30` | Höchstzahl neuer Registrierungsanfragen pro Stunde (Schutz des Mail-Postfachs) |
| `SMTP_HOST` / `SMTP_PORT` | – | `smtp.ionos.de` / `587` | Mailserver (587 = STARTTLS, 465 = SSL) |
| `SMTP_SECURE` | – | abhängig vom Port | `true` erzwingt SSL |
| `SMTP_USER` / `SMTP_PASS` | für Mailversand | leer | Zugang des Postfachs. Ohne Werte werden Mails nur ins Log geschrieben |
| `MAIL_FROM` | – | `SMTP_USER` | Absenderadresse; bei IONOS die Adresse des Postfachs |
| `APP_NAME` | – | `Gruppen-Reiseplaner` | Name in E-Mails |
| `RAPIDAPI_KEY` | – | leer | Echte Booking.com-/Airbnb-Suche; ohne Key Beispieldaten |
| `BOOKING_RAPIDAPI_HOST` / `AIRBNB_RAPIDAPI_HOST` | – | siehe Code | RapidAPI-Hosts |
| `GOOGLE_MAPS_API_KEY` | – | leer | Entfernungsberechnung (Distance Matrix API) |

## Lokale Entwicklung ohne Docker

Das Backend liest `backend/.env` (über `dotenv`). Mindestens nötig:

```
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://<user>:<passwort>@localhost:5432/tripplanner
```

Das Frontend liest `frontend/.env.local` (Vorlage: `frontend/.env.local.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

## E-Mail (IONOS)

1. Im IONOS-Kundencenter ein Postfach anlegen und ein **App-Passwort** erzeugen.
2. `SMTP_USER`, `SMTP_PASS` und `MAIL_FROM` in der `.env` **auf dem Server** eintragen.
3. Backend neu starten (`docker compose up -d backend`) und testen:

```bash
docker compose exec backend node dist/scripts/send-test-mail.js <empfaenger-adresse>
```

Wurde ein Passwort versehentlich weitergegeben (Chat, Ticket, Commit), im IONOS-Kundencenter ein
neues App-Passwort erzeugen, das alte löschen und die `.env` aktualisieren.
