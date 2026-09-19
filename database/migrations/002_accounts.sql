-- ============================================================
-- Migration 002: Passwort-Accounts, Admin-Einladungen, Passwort-Reset
-- Additiv und idempotent: bestehende Daten bleiben erhalten.
-- Anwenden:  docker compose exec -T db psql -U postgres -d tripplanner < database/migrations/002_accounts.sql
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- users: Passwort, Rolle, Status, Login-Schutz
-- ------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role           TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_logins  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until   TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled'));
  END IF;
END $$;

-- E-Mail-Adressen sind case-insensitiv eindeutig
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- ------------------------------------------------------------
-- user_invites: Admin-Einladungen (Token nur als SHA-256-Hash)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  token_hash  TEXT UNIQUE NOT NULL,
  invited_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites (lower(email));

-- ------------------------------------------------------------
-- password_resets: Reset-Links (Token nur als SHA-256-Hash)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets (user_id);

-- ------------------------------------------------------------
-- trip_users: Teilnehmer sind jetzt Accounts (session_token entfällt)
-- ------------------------------------------------------------
ALTER TABLE trip_users ALTER COLUMN session_token DROP NOT NULL;

-- ein Account kann pro Trip nur einmal Teilnehmer sein
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_users_trip_user
  ON trip_users (trip_id, user_id) WHERE user_id IS NOT NULL;

COMMIT;
