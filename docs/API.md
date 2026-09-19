# API-Design – Gruppen-Reiseplaner

Basis-URL: `http://localhost:4000/api` (Produktion: `https://<domain>/api`)

## Authentifizierung

Die App ist **invite-only**: Konten entstehen ausschließlich über eine Einladung eines
Administrators. Angemeldet wird mit E-Mail und Passwort.

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

### `POST /auth/login`
```json
{ "email": "anna@example.com", "password": "…" }
```
`200` → `{ "user": { "id", "email", "name", "role", "status", … } }` + Session-Cookie.
Falsche Daten → `401` mit generischer Meldung. Nach 5 Fehlversuchen ist das Konto 15 Minuten
gesperrt (`429`).

### `POST /auth/logout`
Löscht das Session-Cookie.

### `GET /auth/me` · `PATCH /auth/me`
Eigenes Profil lesen bzw. Anzeigenamen ändern (`{ "name": "Anna" }`).

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
Voting schließen bzw. wieder öffnen. Nur Ersteller.

---

## Terminoptionen

### `POST /trips/:tripId/date-options`
Fügt einen oder mehrere Termine hinzu (Duplikate mit gleichem Zeitraum werden übersprungen).
Nur Ersteller.

```json
{ "dateOptions": [
  { "label": "Wochenende 20.–22. Nov. 2026", "startDate": "2026-11-20", "endDate": "2026-11-22" }
] }
```

### `GET /trips/:tripId/date-options`
Alle Terminoptionen eines Trips (Datumsfelder als `JJJJ-MM-TT`).

### `DELETE /trips/:tripId/date-options/:dateOptionId`
Entfernt einen Termin samt Stimmen. Nur Ersteller.

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
Berechnet Top-Termin, vollständiges Terminranking und häufigste Wünsche.

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
