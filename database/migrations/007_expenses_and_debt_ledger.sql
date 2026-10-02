-- ============================================================
-- Migration 007: Ausgaben-Ledger (inkl. Unterkunftskosten), manuelle Zahlungen/Schulden,
-- Wunschlisten-Beanspruchung ("ich kaufe das") für die Einkaufsliste.
-- Additiv und idempotent.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/007_expenses_and_debt_ledger.sql
-- ============================================================

BEGIN;

-- Wunschliste: jemand kündigt an, einen Artikel zu kaufen, bevor er ihn abhakt
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES trip_users(id) ON DELETE SET NULL;
ALTER TABLE grocery_items ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Unterkunftskosten (Gesamtpreis + wer vorgestreckt hat), fließt als Posten in die Abrechnung ein
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_total_price NUMERIC(10, 2) CHECK (accommodation_total_price >= 0);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accommodation_paid_by UUID REFERENCES trip_users(id) ON DELETE SET NULL;

-- trip_expenses: manuelle Ausgaben, die unter der Gruppe aufgeteilt werden (z. B. Taxi, Tickets),
-- optional mit eingescanntem Beleg (Dateiname, nicht öffentlich erreichbar)
CREATE TABLE IF NOT EXISTS trip_expenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  paid_by       UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  receipt_path  TEXT,
  created_by    UUID REFERENCES trip_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id);

-- trip_expense_participants: wer sich an einer Ausgabe beteiligt (zum Erfassungszeitpunkt fixiert,
-- damit später beitretende Mitglieder nicht rückwirkend mithaften)
CREATE TABLE IF NOT EXISTS trip_expense_participants (
  expense_id    UUID NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
  trip_user_id  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, trip_user_id)
);

-- trip_settlements: manuelle Zahlung zwischen zwei Mitgliedern, gleicht Schulden aus
CREATE TABLE IF NOT EXISTS trip_settlements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id            UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_trip_user_id  UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,  -- zahlt
  to_trip_user_id    UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,  -- empfängt
  amount             NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  note               TEXT,
  created_by         UUID REFERENCES trip_users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (from_trip_user_id <> to_trip_user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_settlements_trip_id ON trip_settlements(trip_id);

COMMIT;
