-- ============================================================
-- Migration 008: Unterkunfts-Vorschläge durch die Gruppe (manuell, ohne Booking/Airbnb) –
-- unabhängig von der RapidAPI-Suche und der einen fest ausgewählten Unterkunft.
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/008_stay_suggestions.sql
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS trip_stay_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,  -- wer den Vorschlag eingetragen hat
  title         TEXT NOT NULL,
  address       TEXT,
  url           TEXT,
  image_url     TEXT,
  note          TEXT,
  price         NUMERIC(10, 2) CHECK (price >= 0),  -- Gesamtpreis, optional
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_stay_suggestions_trip_id ON trip_stay_suggestions(trip_id);

COMMIT;
