-- ============================================================
-- Migration 009: Platzhalter-Mitglieder (fahren mit, haben noch kein Konto) und wählbare
-- Aufteilung von Ausgaben (alle Mitglieder oder nur bestimmte).
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/009_placeholders_and_expense_split.sql
-- ============================================================

BEGIN;

-- Platzhalter zählen in der Kasse mit, stimmen aber nicht ab und bekommen keine Mails.
ALTER TABLE trip_users ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN NOT NULL DEFAULT false;

-- true: auf alle aktuellen Mitglieder verteilt; false: nur auf die in trip_expense_participants.
ALTER TABLE trip_expenses ADD COLUMN IF NOT EXISTS split_all BOOLEAN NOT NULL DEFAULT true;

-- Spenden von außen (jemand, der nicht mitfährt): das Geld erhält ein Mitglied, es senkt die
-- Kosten für alle Mitreisenden gleichmäßig. Der Spender ist nur ein Name, kein Konto nötig.
CREATE TABLE IF NOT EXISTS trip_donations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  donor_name   TEXT NOT NULL,
  amount       NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  received_by  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  note         TEXT,
  created_by   UUID REFERENCES trip_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_donations_trip_id ON trip_donations(trip_id);

COMMIT;
