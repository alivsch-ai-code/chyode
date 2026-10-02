-- ============================================================
-- Migration 005: Einkaufsliste (mit Preis & Kostenaufteilung), Aktivitäten in der Nähe,
-- fest ausgewählte Unterkunft je Reise (Bewertung & Ausstattung).
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/005_groceries_activities_accommodation.sql
-- ============================================================

BEGIN;

-- Gemeinsame Einkaufsliste: wer möchte was zum Essen/Trinken (Wunsch und Einkaufsartikel sind hier
-- bewusst ein Eintrag, nicht zwei getrennte Schritte — das reicht für eine Gruppe und bleibt einfach).
CREATE TABLE IF NOT EXISTS grocery_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,  -- wer es eingetragen hat/möchte
  item          TEXT NOT NULL,
  quantity      TEXT,                                          -- z. B. "2 Packungen", "1 kg"
  note          TEXT,                                          -- z. B. Allergie-Hinweis
  price         NUMERIC(10, 2) CHECK (price >= 0),              -- Preis des Artikels, für die Kostenaufteilung
  checked_at    TIMESTAMPTZ,                                    -- gesetzt, sobald jemand es gekauft/abgehakt hat
  checked_by    UUID REFERENCES trip_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grocery_items_trip_id ON grocery_items(trip_id);

-- Gesammelte Aktivitäten-Ideen in der Nähe des Reiseziels (manuell von der Gruppe gepflegt,
-- keine Anbindung an Google Places o. Ä.)
CREATE TABLE IF NOT EXISTS trip_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  category      TEXT CHECK (category IS NULL OR category IN ('wellness', 'nature', 'sport', 'food')),
  distance_km   NUMERIC(6, 1) CHECK (distance_km >= 0),
  price         NUMERIC(10, 2) CHECK (price >= 0),
  description   TEXT,
  link          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);

-- Fest ausgewählte Unterkunft (unabhängig von der Vorschlagssuche, z. B. manuell gebucht)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_title TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_address TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_url TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_image_url TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_note TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_rating NUMERIC(2, 1) CHECK (accommodation_rating BETWEEN 0 AND 5);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_amenities TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_picked_by UUID REFERENCES trip_users(id) ON DELETE SET NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_picked_at TIMESTAMPTZ;

COMMIT;
