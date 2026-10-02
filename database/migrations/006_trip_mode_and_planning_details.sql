-- ============================================================
-- Migration 006: Zwei Modi je Reise (Abstimmung/Planung), Mahlzeiten-Kategorie für die
-- Einkaufsliste, Dauer für Aktivitäten/Routen.
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/006_trip_mode_and_planning_details.sql
-- ============================================================

BEGIN;

-- 'voting': klassische Abstimmung über Termine/Wünsche. 'planning': schon gebucht, der Fokus
-- liegt auf Essen/Aktivitäten/Unterkunft statt auf Terminwahl. Der Ersteller kann jederzeit wechseln.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'voting' CHECK (mode IN ('voting', 'planning'));

-- Mahlzeit, zu der ein Einkaufslisten-Eintrag gehört (für die Gruppierung in der Oberfläche)
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IS NULL OR category IN ('breakfast', 'lunch', 'dinner', 'other'));

-- Geschätzte Dauer einer Aktivität/Route in Minuten (ergänzt distance_km)
ALTER TABLE trip_activities ADD COLUMN IF NOT EXISTS duration_min INTEGER CHECK (duration_min >= 0);

COMMIT;
