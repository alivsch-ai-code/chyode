-- ============================================================
-- Migration 004: Präferenzen (Budget, Erlebnisse, Unterkunftsarten), Ergebnis-Freigabe,
-- Terminvorschläge durch Teilnehmer.
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/004_preferences_and_release.sql
-- ============================================================

BEGIN;

-- Ergebnis-Freigabe: solange NULL, sehen nur Ersteller die Auswertung
ALTER TABLE trips ADD COLUMN IF NOT EXISTS results_released_at TIMESTAMPTZ;

-- Wann wurden alle Teilnehmer per E-Mail über das feststehende Ergebnis informiert? (verhindert Doppelversand)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS results_notified_at TIMESTAMPTZ;

-- Zeitpunkt, an dem die Abstimmung beendet wurde (Startpunkt der automatischen Löschfrist)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS voting_closed_at TIMESTAMPTZ;
UPDATE trips SET voting_closed_at = updated_at WHERE status <> 'voting' AND voting_closed_at IS NULL;

-- Erweiterte Unterkunftsarten
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_trip_type_check;
ALTER TABLE trips ADD CONSTRAINT trips_trip_type_check
  CHECK (trip_type IN ('hut', 'chalet', 'hotel', 'wellness', 'apartment', 'glamping', 'other'));

-- Wer hat den Termin vorgeschlagen? (NULL = Altdaten/Ersteller beim Anlegen des Trips)
ALTER TABLE date_options ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES trip_users(id) ON DELETE SET NULL;

-- Persönliche Präferenzen je Teilnehmer und Trip
CREATE TABLE IF NOT EXISTS participant_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id               UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id          UUID NOT NULL UNIQUE REFERENCES trip_users(id) ON DELETE CASCADE,
  budget_accommodation  NUMERIC(10, 2) CHECK (budget_accommodation >= 0),  -- max. Summe pro Person für die Übernachtung
  budget_activities     NUMERIC(10, 2) CHECK (budget_activities >= 0),     -- max. Summe pro Person für Aktivitäten
  experiences           TEXT[] NOT NULL DEFAULT '{}',
  accommodation_types   TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_participant_preferences_trip_id ON participant_preferences (trip_id);

COMMIT;
