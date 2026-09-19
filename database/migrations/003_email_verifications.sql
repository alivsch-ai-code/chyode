-- ============================================================
-- Migration 003: Selbstregistrierung mit E-Mail-Bestätigung
-- Additiv und idempotent. Das Konto entsteht erst nach Klick auf den Bestätigungslink;
-- bis dahin liegt die Anfrage (inkl. Passwort-Hash) nur hier.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/003_email_verifications.sql
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS email_verifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT NOT NULL,
  name           TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  redirect_path  TEXT,                       -- optional: Ziel nach der Bestätigung (z. B. Einladungslink)
  token_hash     TEXT UNIQUE NOT NULL,       -- nur der SHA-256-Hash des Links wird gespeichert
  expires_at     TIMESTAMPTZ NOT NULL,
  used_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications (lower(email));
CREATE INDEX IF NOT EXISTS idx_email_verifications_created ON email_verifications (created_at);

COMMIT;
