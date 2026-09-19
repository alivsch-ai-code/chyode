-- ============================================================
-- Gruppen-Reiseplaner – PostgreSQL Schema
-- ============================================================
-- Erstellen mit:  psql -U postgres -d tripplanner -f database/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- für gen_random_uuid()

-- ------------------------------------------------------------
-- users: Accounts (Einladung durch Admin, Login mit Passwort)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  password_hash   TEXT,
  role            TEXT NOT NULL DEFAULT 'user' CONSTRAINT users_role_check CHECK (role IN ('admin', 'user')),
  status          TEXT NOT NULL DEFAULT 'active' CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled')),
  token_version   INTEGER NOT NULL DEFAULT 0,  -- erhöht sich bei Passwortänderung -> alte Sessions ungültig
  failed_logins   INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
-- trips: eine geplante Gruppenreise
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  location            TEXT NOT NULL,
  trip_type           TEXT NOT NULL DEFAULT 'other'
                       CHECK (trip_type IN ('hut', 'wellness', 'hotel', 'other')),
  date_mode           TEXT NOT NULL DEFAULT 'multiple_choice'
                       CHECK (date_mode IN ('fixed', 'multiple_choice')),
  start_date          DATE,               -- gesetzt wenn date_mode = 'fixed'
  end_date            DATE,               -- gesetzt wenn date_mode = 'fixed'
  nights              INTEGER NOT NULL DEFAULT 2 CHECK (nights > 0),
  budget_per_person   NUMERIC(10, 2),
  invite_token        TEXT UNIQUE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'voting'
                       CHECK (status IN ('voting', 'closed', 'booked')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_creator_id ON trips(creator_id);
CREATE INDEX IF NOT EXISTS idx_trips_invite_token ON trips(invite_token);

-- ------------------------------------------------------------
-- trip_users: Teilnehmer eines Trips (inkl. Ersteller als Rolle)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL nur bei Altdaten (frühere Gäste)
  name           TEXT NOT NULL,
  email          TEXT,
  role           TEXT NOT NULL DEFAULT 'participant'
                 CHECK (role IN ('creator', 'participant')),
  session_token  TEXT UNIQUE,          -- veraltet: nur noch für Altdaten, wird nicht mehr genutzt
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_users_trip_id ON trip_users(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_users_session_token ON trip_users(session_token);
-- ein Account kann pro Trip nur einmal Teilnehmer sein
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_users_trip_user
  ON trip_users (trip_id, user_id) WHERE user_id IS NOT NULL;

-- ------------------------------------------------------------
-- date_options: zur Auswahl stehende Termine/Wochenenden
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS date_options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,          -- z. B. "Wochenende 12.–14. Jan"
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_options_trip_id ON date_options(trip_id);

-- ------------------------------------------------------------
-- votes: Stimmen der Teilnehmer für Terminoptionen
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id    UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  date_option_id  UUID NOT NULL REFERENCES date_options(id) ON DELETE CASCADE,
  people_count    INTEGER NOT NULL DEFAULT 1 CHECK (people_count > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_user_id, date_option_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_trip_id ON votes(trip_id);
CREATE INDEX IF NOT EXISTS idx_votes_date_option_id ON votes(date_option_id);

-- ------------------------------------------------------------
-- notes: Wünsche / Ideen / Anforderungen der Teilnehmer
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  trip_user_id   UUID NOT NULL REFERENCES trip_users(id) ON DELETE CASCADE,
  category       TEXT NOT NULL DEFAULT 'wish'
                 CHECK (category IN ('wish', 'idea', 'requirement')),
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_trip_id ON notes(trip_id);

-- ------------------------------------------------------------
-- search_results_cache: gecachte Ergebnisse externer Booking-APIs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_results_cache (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL CHECK (provider IN ('booking', 'airbnb', 'rapidapi')),
  query_hash   TEXT NOT NULL,          -- Hash der Suchparameter (Ort, Datum, Filter)
  results      JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  UNIQUE (trip_id, provider, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_search_results_cache_trip_id ON search_results_cache(trip_id);

-- ------------------------------------------------------------
-- updated_at trigger für trips
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_updated_at ON trips;
CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
