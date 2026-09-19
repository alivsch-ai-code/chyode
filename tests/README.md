# Tests

## Unit-Tests (lokal, ohne Datenbank)

Reine Logik – Statistik, Ranking, Passwort-/Token-Helfer, E-Mail-Vorlagen im Backend sowie
Kalenderwochen, Feiertage und Wochenend-Erzeugung im Frontend. Laufen mit dem eingebauten
Node-Testrunner (über `tsx`):

```bash
cd backend  && npm test
cd frontend && npm test
```

## Integrationstests (gegen einen echten Server mit Datenbank)

Die Skripte in `tests/e2e/` rufen die API über `curl` auf und prüfen Statuscodes und Inhalte.
Sie laufen auf dem Server im Projektverzeichnis und brauchen `docker compose`, `curl` und `jq`.
Sie starten einen **temporären Backend-Container** (`tp-e2e`, Port 4001) mit abgeschaltetem
Mailversand; im Entwicklungsmodus schreibt er Mails ins Log, aus dem die Skripte Links lesen.
Alle Testdaten tragen die Adresse `e2e-*@example.test` und werden am Ende gelöscht.

```bash
cd ~/chyode
docker rm -f tp-e2e tp-e2e2 2>/dev/null
docker compose run -d --rm --no-deps --name tp-e2e -p 127.0.0.1:4001:4000 \
  -e NODE_ENV=development -e FRONTEND_URL=http://localhost:4001 \
  -e SMTP_USER= -e SMTP_PASS= backend

bash tests/e2e/accounts.sh       # Einladung, Login, Reset, Sperre, Rechte, Reise-Flow
bash tests/e2e/features.sh       # Präferenzen, Freigabe, Ergebnis-Mail, Terminvorschläge, Löschung

# Registrierung (zusätzlich ein Container mit ausgeschalteter Registrierung)
docker compose run -d --rm --no-deps --name tp-e2e2 -p 127.0.0.1:4002:4000 \
  -e NODE_ENV=development -e FRONTEND_URL=http://localhost:4002 -e REGISTRATION_ENABLED=false \
  -e SMTP_USER= -e SMTP_PASS= backend
bash tests/e2e/registration.sh

docker rm -f tp-e2e tp-e2e2
```

> **Achtung:** `features.sh` führt die Datenbereinigung (`run-retention.js`) gegen die
> konfigurierte Datenbank aus. Auf einer Live-Datenbank werden dabei auch echte Reisen gelöscht,
> die die Aufbewahrungsfristen überschreiten – so wie es der Server ohnehin regelmäßig tut.
