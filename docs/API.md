# API-Design – Gruppen-Reiseplaner

Basis-URL: `http://localhost:4000/api`

## Auth-Modelle

Es gibt zwei getrennte Auth-Mechanismen:

1. **Creator-JWT** (`Authorization: Bearer <jwt>`) — nach Magic-Link-Login, nur für
   `POST /trips` und `GET /trips` (eigene Trips verwalten).
2. **Participant-Token** (`X-Participant-Token: <token>`) — ohne Passwort beim Beitritt über
   den Einladungslink vergeben, für alle trip-scoped Endpoints (Voting, Notizen, Ergebnisse,
   Unterkunftssuche). Der Ersteller erhält beim Erstellen des Trips ebenfalls einen
   Participant-Token mit `role: "creator"`.

---

## Auth

### `POST /auth/magic-link`
Fordert einen Login-Link für einen Trip-Ersteller an (legt den User bei Bedarf an).

**Input**
```json
{ "email": "anna@example.com", "name": "Anna" }
```

**Output**
```json
{ "message": "Magic-Link wurde versendet.", "devLink": "http://localhost:3000/auth/verify?token=..." }
```

### `GET /auth/verify?token=...`
Verifiziert den Magic-Link-Token und stellt eine Session aus.

**Output**
```json
{ "token": "<jwt>", "user": { "id": "uuid", "email": "anna@example.com" } }
```

### `GET /auth/me`
Liefert das eingeloggte Nutzerprofil. Erfordert Creator-JWT.

---

## Trips

### `POST /trips`
Erstellt einen neuen Trip. Erfordert Creator-JWT.

**Input**
```json
{
  "title": "Mädels-Wochenende im Schwarzwald",
  "location": "Schwarzwald, Deutschland",
  "tripType": "hut",
  "dateMode": "multiple_choice",
  "nights": 2,
  "budgetPerPerson": 150,
  "creatorName": "Anna",
  "dateOptions": [
    { "label": "Wochenende 12.–14. Jan", "startDate": "2026-01-12", "endDate": "2026-01-14" },
    { "label": "Wochenende 19.–21. Jan", "startDate": "2026-01-19", "endDate": "2026-01-21" }
  ]
}
```

**Output**
```json
{
  "trip": { "id": "uuid", "title": "...", "invite_token": "abc123", "status": "voting", "...": "..." },
  "participantToken": "opaque-session-token",
  "inviteLink": "http://localhost:3000/invite/abc123"
}
```

### `GET /trips`
Listet alle Trips des eingeloggten Erstellers. Erfordert Creator-JWT.

### `GET /trips/:tripId`
Trip-Detail inkl. Teilnehmerliste. Erfordert Participant-Token.

### `GET /trips/invite/:inviteToken`
Öffentliche Trip-Vorschau für die Einladungsseite (kein Auth nötig).

**Output**
```json
{
  "trip": { "id": "uuid", "title": "...", "location": "...", "status": "voting" },
  "participantCount": 4
}
```

### `POST /trips/invite/:inviteToken/join`
Teilnehmer tritt ohne Passwort bei.

**Input**
```json
{ "name": "Ben", "email": "ben@example.com" }
```

**Output**
```json
{
  "participant": { "id": "uuid", "name": "Ben", "role": "participant", "session_token": "..." },
  "trip": { "id": "uuid", "...": "..." }
}
```

### `POST /trips/:tripId/close-voting`
Schließt das Voting. Nur Ersteller (Participant-Token mit `role: creator`).

---

## Terminoptionen

### `POST /trips/:tripId/date-options`
Fügt eine Terminoption hinzu. Nur Ersteller.

```json
{ "label": "Wochenende 26.–28. Jan", "startDate": "2026-01-26", "endDate": "2026-01-28" }
```

### `GET /trips/:tripId/date-options`
Alle Terminoptionen eines Trips.

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
Eigene Stimmen des angemeldeten Teilnehmers.

### `DELETE /trips/:tripId/votes/:dateOptionId`
Zieht die eigene Stimme zurück.

---

## Notizen

### `POST /trips/:tripId/notes`
```json
{ "category": "wish", "content": "Sauna wäre toll, mind. 3 Schlafzimmer" }
```

### `GET /trips/:tripId/notes`
Alle Notizen eines Trips (inkl. Autor:in).

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
      "label": "Wochenende 12.–14. Jan",
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
Löst die automatische Suche über Booking.com + Airbnb (RapidAPI) aus, bewertet die
Ergebnisse anhand von Budget, Bewertung, Entfernung und Gruppenwünschen und cached sie.
Nur Ersteller.

```json
{ "origin": "München, Deutschland" }
```

**Output**
```json
{
  "topSuggestions": [
    {
      "id": "booking-mock-2",
      "provider": "booking",
      "name": "Wellness Chalet, Schwarzwald",
      "pricePerNight": 310,
      "pricePerPerson": 77.5,
      "rating": 9.5,
      "distanceKm": 210.4,
      "amenities": ["sauna", "pool", "whirlpool", "4 schlafzimmer"],
      "matchReasons": ["Erfüllt Gruppenwünsche: sauna", "4 schlafzimmer für 8 Personen"],
      "score": 68.4
    }
  ],
  "allSuggestions": ["..."]
}
```

### `GET /trips/:tripId/accommodations`
Liefert die zuletzt gecachten Top-3-Vorschläge (`search_results_cache`).
