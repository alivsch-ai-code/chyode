# API-Design – Gruppen-Reiseplaner

Basis-URL: `http://localhost:4000/api` (Produktion: `https://<domain>/api`)

## Authentifizierung

Konten entstehen entweder per **Einladung** eines Administrators oder per **Selbstregistrierung**
mit E-Mail-Bestätigung (abschaltbar über `REGISTRATION_ENABLED=false`). Angemeldet wird mit
E-Mail und Passwort.

- Nach dem Login setzt der Server ein **HttpOnly-, Secure-, SameSite=Lax-Cookie** (`tp_session`,
  JWT, 7 Tage). Der Client sendet es automatisch mit (`credentials: 'include'`); es gibt kein
  Token in `localStorage`.
- Ein Passwortwechsel/-reset erhöht die `token_version` des Kontos und beendet damit alle
  bestehenden Sitzungen.
- **Trip-scoped Endpoints** (`/trips/:tripId/...`) erfordern zusätzlich, dass das Konto
  Mitglied des Trips ist (sonst `403`). Ersteller-Aktionen erfordern die Trip-Rolle `creator`.
- Fehler haben die Form `{ "error": "Meldung" }`.

Rollen: `admin` (Nutzer/Einladungen verwalten) und `user`. Innerhalb eines Trips gibt es
`creator` (Ersteller) und `participant`. Jeder Account darf Trips erstellen und ist dort
Ersteller.

---

## Auth

### `GET /auth/config`
Öffentliche Einstellungen für die Oberfläche:
`{ "registrationEnabled": true, "tripRetentionDays": 7, "tripMaxAgeDays": 90 }`.

### `POST /auth/register`
Nimmt eine Registrierung entgegen. Es wird **noch kein Konto angelegt**: erst der Klick auf den
Bestätigungslink aus der E-Mail (24 Stunden gültig, einmalig) erzeugt es.
```json
{ "name": "Anna", "email": "anna@example.com", "password": "mind. 10 Zeichen", "next": "/invite/abc123" }
```
`next` (optional, nur relative Pfade) ist das Ziel nach der Bestätigung. Die Antwort ist immer
gleich (`200`), damit nicht erkennbar ist, welche Adressen schon registriert sind; existiert
bereits ein Konto, geht stattdessen ein Hinweis an das Postfach. Pro Adresse höchstens eine Mail
pro Minute, insgesamt höchstens `REGISTRATION_HOURLY_LIMIT` Anfragen pro Stunde (`429`).
Bei geschlossener Registrierung `403`.

### `POST /auth/verify-email`
```json
{ "token": "…" }
```
Bestätigt die Adresse, legt das Konto an (bzw. schaltet ein Altkonto ohne Passwort frei),
ordnet frühere Gast-Teilnahmen zu und meldet an → `201 { "user": {…}, "next": "/invite/abc123" | null }`.
Ungültig/abgelaufen → `404`, Konto existiert schon → `409`.

### `POST /auth/login`
```json
{ "email": "anna@example.com", "password": "…" }
```
`200` → `{ "user": { "id", "email", "name", "role", "status", … } }` + Session-Cookie.
Falsche Daten → `401` mit generischer Meldung. Nach 5 Fehlversuchen ist das Konto 15 Minuten
gesperrt (`429`).

### `POST /auth/logout`
Löscht das Session-Cookie.

### `GET /auth/me` · `PATCH /auth/me` · `DELETE /auth/me`
Eigenes Profil lesen bzw. Anzeigenamen ändern (`{ "name": "Anna" }`). `DELETE` löscht das Konto samt
aller Daten (Recht auf Löschung): `{ "password": "…" }` zur Bestätigung → `204`. Reisen, die das
Konto erstellt hat, werden vollständig gelöscht, Teilnahmen an anderen Reisen ebenfalls. Der letzte
Administrator kann sich nicht löschen (`409`).

### `POST /auth/change-password`
```json
{ "currentPassword": "…", "newPassword": "mind. 10 Zeichen" }
```
Beendet alle anderen Sitzungen und verschickt eine Bestätigungsmail.

### `GET /auth/invite/:token`
Prüft eine Einladung → `{ "invite": { "email", "name", "expiresAt" } }` oder `404`.

### `POST /auth/accept-invite`
Legt das Konto an (bzw. aktiviert ein Altkonto), ordnet frühere Gast-Teilnahmen mit gleicher
E-Mail zu und meldet an.
```json
{ "token": "…", "name": "Anna", "password": "mind. 10 Zeichen" }
```

### `POST /auth/forgot-password`
```json
{ "email": "anna@example.com" }
```
Antwortet **immer** gleich (`200`), damit keine Konten erraten werden können. Existiert das
Konto, wird ein Reset-Link (60 Minuten gültig, einmalig verwendbar) per E-Mail verschickt;
höchstens ein Link pro Minute.

### `GET /auth/reset/:token` · `POST /auth/reset-password`
Link prüfen bzw. neues Passwort setzen (`{ "token": "…", "password": "…" }`).

---

## Administration (nur `role: admin`)

| Methode | Pfad | Zweck |
| --- | --- | --- |
| `GET` | `/admin/users` | Alle Konten |
| `PATCH` | `/admin/users/:id` | `{ "role": "admin" \| "user", "status": "active" \| "disabled" }` |
| `GET` | `/admin/invites` | Einladungen inkl. Status (`pending`, `accepted`, `revoked`, `expired`) |
| `POST` | `/admin/invites` | `{ "email", "name?", "role?" }` → Einladung + E-Mail |
| `POST` | `/admin/invites/:id/resend` | Neuer Link, erneuter Versand |
| `DELETE` | `/admin/invites/:id` | Einladung widerrufen |

`POST /admin/invites` und `.../resend` liefern zusätzlich `link`, `emailSent` und ggf.
`emailError`. Der Link geht nur an den angemeldeten Admin zurück (Fallback, falls die Mail
nicht ankommt). Sich selbst die Adminrechte zu entziehen oder das letzte aktive Admin-Konto
zu entfernen ist nicht möglich.

---

## Trips

### `POST /trips`
Erstellt einen Trip; das angemeldete Konto wird Ersteller.

```json
{
  "title": "Hüttenwochenende Herbst",
  "location": "Allgäu",
  "tripType": "hut",
  "dateMode": "multiple_choice",
  "nights": 2,
  "budgetPerPerson": 150,
  "dateOptions": [
    { "label": "Wochenende 6.–8. Nov. 2026", "startDate": "2026-11-06", "endDate": "2026-11-08" }
  ]
}
```
Bei `dateMode: "fixed"` stattdessen `startDate` und `endDate` angeben.

**Output** `201`
```json
{
  "trip": { "id": "uuid", "title": "…", "invite_token": "abc123", "status": "voting" },
  "inviteLink": "https://<domain>/invite/abc123"
}
```

### `GET /trips`
Alle Trips, in denen das Konto Mitglied ist (inkl. `my_role`, `participant_count`,
`date_option_count`).

### `GET /trips/:tripId`
Trip-Detail für Mitglieder: `trip`, `participants`, `myRole`, `myParticipantId`, `inviteLink`.

### `GET /trips/invite/:inviteToken`
Öffentliche Vorschau für die Einladungsseite (kein Login nötig):
```json
{
  "trip": { "id": "uuid", "title": "…", "location": "…", "status": "voting", "creator_name": "Anna" },
  "participantCount": 4
}
```

### `POST /trips/invite/:inviteToken/join`
Angemeldetes Konto tritt dem Trip bei (idempotent) → `{ "tripId": "uuid", "alreadyMember": false }`.
Bei geschlossenem Voting `403`, außer das Konto ist bereits Mitglied.

### `POST /trips/:tripId/close-voting` · `POST /trips/:tripId/reopen-voting`
Voting schließen bzw. wieder öffnen. Nur Ersteller. Mit dem Schließen beginnt die automatische
Löschfrist (`TRIP_RETENTION_DAYS`); Wiederöffnen setzt sie zurück. Nach dem Schließen sind
Abstimmen, Präferenzen ändern und Terminvorschläge gesperrt (`403`).

### `POST /trips/:tripId/release-results` · `POST /trips/:tripId/hide-results`
Gibt die Auswertung für Teilnehmer frei bzw. nimmt die Freigabe zurück. Nur Ersteller. Solange
nicht freigegeben, sehen Teilnehmer weder `/results`, `/votes` (Liste) noch `/accommodations`
(`403`) und in `/notes` nur ihre eigenen Notizen. Sind bei der Freigabe (oder mit der letzten
fehlenden Stimme) alle Mitglieder abgestimmt, erhalten alle **einmalig** eine E-Mail „Das Ergebnis steht fest“ (Markierung `results_notified_at`).

### `DELETE /trips/:tripId`
Löscht die Reise samt aller Daten sofort (nur Ersteller) → `204`.

`GET /trips/:tripId` liefert zusätzlich `resultsReleased`, `resultsNotified` und – nur für den
Ersteller – `progress: { voted, total }`.

---

## Terminoptionen

### `POST /trips/:tripId/date-options`
Schlägt einen oder mehrere Termine vor (Duplikate mit gleichem Zeitraum werden übersprungen).
Jedes Mitglied darf, solange abgestimmt werden kann; Teilnehmer höchstens 5 eigene Termine
(Ersteller unbegrenzt). Der Vorschlagende wird gespeichert und in der Liste angezeigt
(`proposed_by_name`, `proposed_by_creator`).

```json
{ "dateOptions": [
  { "label": "Wochenende 20.–22. Nov. 2026", "startDate": "2026-11-20", "endDate": "2026-11-22" }
] }
```

### `GET /trips/:tripId/date-options`
Alle Terminoptionen eines Trips (Datumsfelder als `JJJJ-MM-TT`).

### `DELETE /trips/:tripId/date-options/:dateOptionId`
Entfernt einen Termin samt Stimmen. Ersteller jeden Termin, Teilnehmer nur ihre eigenen Vorschläge.

---

## Präferenzen

Jedes Mitglied gibt seine Höchstbeträge und Wünsche an. Andere sehen nur die anonymisierte
Gruppenauswertung (siehe `/results`), nie einzelne Angaben.

### `GET /trips/:tripId/preferences/me`
`{ "preferences": { budgetAccommodation, budgetActivities, experiences[], accommodationTypes[], updatedAt } | null }`

### `PUT /trips/:tripId/preferences`
```json
{
  "budgetAccommodation": 200,
  "budgetActivities": 100,
  "experiences": ["nature", "wellness"],
  "accommodationTypes": ["hut", "wellness"]
}
```
Budgets in Euro pro Person für den gesamten Aufenthalt (`null` = keine Angabe, 0–100000).
Erlebnisse (höchstens 4): `nature`, `wellness`, `winter`, `culinary`, `adventure`, `culture`, `water`,
`social`, `calm`. Unterkunftsarten (höchstens 3): `hut`, `chalet`, `hotel`, `wellness`, `apartment`,
`glamping`. Nur solange die Abstimmung läuft.

---

## Voting

### `POST /trips/:tripId/votes`
Stimmt für eine Terminoption ab (Upsert pro Teilnehmer + Option).

```json
{ "dateOptionId": "uuid", "peopleCount": 2 }
```

### `GET /trips/:tripId/votes`
Alle Stimmen eines Trips (inkl. Namen).

### `GET /trips/:tripId/votes/me`
Eigene Stimmen.

### `DELETE /trips/:tripId/votes/:dateOptionId`
Zieht die eigene Stimme zurück.

---

## Notizen

### `POST /trips/:tripId/notes`
```json
{ "category": "wish", "content": "Sauna wäre toll, mind. 3 Schlafzimmer" }
```

### `GET /trips/:tripId/notes`
Alle Notizen eines Trips (inkl. `author_name`).

### `DELETE /trips/:tripId/notes/:noteId`
Löscht die eigene Notiz.

---

## Ergebnisse

### `GET /trips/:tripId/results`
Berechnet Top-Termin, Terminranking, **Budget-Statistik** (je Übernachtung, Aktivitäten und
gesamt: Anzahl, Median, Durchschnitt, Minimum, Maximum), Erlebnis- und Unterkunftswünsche sowie
häufigste Schlagworte aus den Notizen. Ersteller immer, Teilnehmer erst nach Freigabe (sonst `403`).

**Output**
```json
{
  "results": {
    "topDateOption": {
      "dateOptionId": "uuid",
      "label": "Wochenende 6.–8. Nov. 2026",
      "totalVotes": 5,
      "totalPeople": 8,
      "voterNames": ["Anna", "Ben", "..."]
    },
    "dateOptionRanking": ["..."],
    "topWishes": [{ "keyword": "sauna", "count": 4, "category": "wish" }],
    "budget": {
      "accommodation": { "count": 5, "median": 200, "average": 217, "min": 120, "max": 350 },
      "activities": { "count": 5, "median": 100, "average": 110, "min": 50, "max": 180 },
      "total": { "count": 5, "median": 300, "average": 327, "min": 170, "max": 530 }
    },
    "experiences": [{ "key": "nature", "count": 4 }],
    "accommodationTypes": [{ "key": "hut", "count": 3 }],
    "preferencesSubmitted": 5,
    "totalParticipants": 6,
    "votedParticipants": 5
  }
}
```

---

## Unterkunftssuche

### `POST /trips/:tripId/accommodations/search`
Löst die Suche über Booking.com + Airbnb (RapidAPI) aus, bewertet die Ergebnisse anhand von
Budget, Bewertung, Entfernung und Gruppenwünschen und cached sie. Nur Ersteller.

```json
{ "origin": "München, Deutschland", "maxPricePerNight": 300 }
```

**Output**
```json
{
  "topSuggestions": [
    {
      "id": "booking-mock-2",
      "provider": "booking",
      "name": "Wellness Chalet, Allgäu",
      "pricePerNight": 310,
      "pricePerPerson": 77.5,
      "rating": 9.5,
      "distanceKm": 210.4,
      "amenities": ["sauna", "pool", "whirlpool", "4 schlafzimmer"],
      "matchReasons": ["Erfüllt Gruppenwünsche: sauna", "4 schlafzimmer für 8 Personen"],
      "score": 68.4
    }
  ],
  "allSuggestions": ["..."],
  "demo": true
}
```
`demo: true` bedeutet: kein `RAPIDAPI_KEY` konfiguriert, die Liste besteht aus Beispieldaten.

### `GET /trips/:tripId/accommodations`
Liefert die zuletzt gecachten Vorschläge (`search_results_cache`), ebenfalls mit `demo`-Flag.
