-- ============================================================
-- PICKLEBALL CUP APP - Schema SQL completo
-- Ejecutar en Supabase SQL Editor en el orden indicado
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'jugador' CHECK (role IN ('admin', 'jugador')),
  phone       TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: players
-- Pueden existir sin cuenta (creados por admin) o vinculados a un profile
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  display_name  TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT players_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_players_profile_id ON players(profile_id);

-- ============================================================
-- TABLA: tournaments
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','league_finished','finals_active','finished')),
  current_phase           TEXT NOT NULL DEFAULT 'league'
                            CHECK (current_phase IN ('league','finals')),
  total_players           INTEGER NOT NULL,
  total_teams             INTEGER NOT NULL DEFAULT 2,
  players_per_team        INTEGER NOT NULL,
  total_courts            INTEGER NOT NULL,
  players_per_match       INTEGER NOT NULL DEFAULT 4,
  simultaneous_players    INTEGER GENERATED ALWAYS AS (total_courts * players_per_match) STORED,
  total_league_rounds     INTEGER NOT NULL,
  match_duration_minutes  INTEGER NOT NULL,
  created_by              UUID NOT NULL REFERENCES profiles(id),
  started_at              TIMESTAMPTZ,
  finished_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tournaments_total_players_positive       CHECK (total_players > 0),
  CONSTRAINT tournaments_total_teams_min              CHECK (total_teams > 1),
  CONSTRAINT tournaments_players_per_team_min         CHECK (players_per_team > 1),
  CONSTRAINT tournaments_total_courts_positive        CHECK (total_courts > 0),
  CONSTRAINT tournaments_match_duration_positive      CHECK (match_duration_minutes > 0),
  CONSTRAINT tournaments_total_league_rounds_positive CHECK (total_league_rounds > 0),
  CONSTRAINT tournaments_player_team_consistency      CHECK (total_players = total_teams * players_per_team)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_tournaments_status     ON tournaments(status);

-- ============================================================
-- TABLA: teams
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT,
  rank_seed     INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teams_unique_name_per_tournament UNIQUE (tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_tournament_id ON teams(tournament_id);

-- ============================================================
-- TABLA: tournament_players
-- Jugadores asignados a un torneo (y a un equipo)
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_players (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id       UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seed_order          INTEGER,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  total_byes          INTEGER NOT NULL DEFAULT 0,
  total_matches_played INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tournament_players_unique_player UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_player     ON tournament_players(player_id);
CREATE INDEX IF NOT EXISTS idx_tournament_players_team       ON tournament_players(team_id);

-- ============================================================
-- TABLA: rounds
-- ============================================================
CREATE TABLE IF NOT EXISTS rounds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_number  INTEGER NOT NULL,
  phase         TEXT NOT NULL CHECK (phase IN ('league','finals')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','finished')),
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rounds_unique_per_phase UNIQUE (tournament_id, phase, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_tournament_id ON rounds(tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status        ON rounds(status);

-- ============================================================
-- TABLA: matches
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  phase           TEXT NOT NULL CHECK (phase IN ('league','finals')),
  court_number    INTEGER NOT NULL,
  match_order     INTEGER NOT NULL DEFAULT 1,
  team_a_id       UUID NOT NULL REFERENCES teams(id),
  team_b_id       UUID NOT NULL REFERENCES teams(id),
  team_a_score    INTEGER NOT NULL DEFAULT 0,
  team_b_score    INTEGER NOT NULL DEFAULT 0,
  team_a_bonus    INTEGER NOT NULL DEFAULT 0,
  team_b_bonus    INTEGER NOT NULL DEFAULT 0,
  winner_team_id  UUID REFERENCES teams(id),
  is_draw         BOOLEAN NOT NULL DEFAULT FALSE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','live','finished')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_court_positive CHECK (court_number > 0),
  CONSTRAINT matches_different_teams CHECK (team_a_id <> team_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_round_id      ON matches(round_id);
CREATE INDEX IF NOT EXISTS idx_matches_status        ON matches(status);

-- ============================================================
-- TABLA: match_pairs
-- Una pareja por equipo por partido (2 registros por match)
-- ============================================================
CREATE TABLE IF NOT EXISTS match_pairs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pair_label  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_pairs_unique_team_per_match UNIQUE (match_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_pairs_match_id ON match_pairs(match_id);

-- ============================================================
-- TABLA: match_pair_players
-- Los 2 jugadores de cada pareja
-- ============================================================
CREATE TABLE IF NOT EXISTS match_pair_players (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_pair_id  UUID NOT NULL REFERENCES match_pairs(id) ON DELETE CASCADE,
  player_id      UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT match_pair_players_unique UNIQUE (match_pair_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_pair_players_pair   ON match_pair_players(match_pair_id);
CREATE INDEX IF NOT EXISTS idx_match_pair_players_player ON match_pair_players(player_id);

-- ============================================================
-- TABLA: round_byes
-- Jugadores que descansan en una ronda
-- ============================================================
CREATE TABLE IF NOT EXISTS round_byes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id      UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT round_byes_unique_player_per_round UNIQUE (round_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_round_byes_round_id  ON round_byes(round_id);
CREATE INDEX IF NOT EXISTS idx_round_byes_player_id ON round_byes(player_id);

-- ============================================================
-- TABLA: team_standings
-- Clasificación de equipos
-- ============================================================
CREATE TABLE IF NOT EXISTS team_standings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  matches_played  INTEGER NOT NULL DEFAULT 0,
  matches_won     INTEGER NOT NULL DEFAULT 0,
  matches_drawn   INTEGER NOT NULL DEFAULT 0,
  matches_lost    INTEGER NOT NULL DEFAULT 0,
  points_scored   INTEGER NOT NULL DEFAULT 0,
  bonus_points    INTEGER NOT NULL DEFAULT 0,
  total_points    INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT team_standings_unique UNIQUE (tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_team_standings_tournament ON team_standings(tournament_id);

-- ============================================================
-- TABLA: individual_standings
-- Clasificación individual dentro de cada equipo
-- ============================================================
CREATE TABLE IF NOT EXISTS individual_standings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id      UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id            UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id          UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  matches_played     INTEGER NOT NULL DEFAULT 0,
  byes               INTEGER NOT NULL DEFAULT 0,
  matches_won        INTEGER NOT NULL DEFAULT 0,
  matches_drawn      INTEGER NOT NULL DEFAULT 0,
  matches_lost       INTEGER NOT NULL DEFAULT 0,
  points_scored      INTEGER NOT NULL DEFAULT 0,
  points_conceded    INTEGER NOT NULL DEFAULT 0,
  point_difference   INTEGER NOT NULL DEFAULT 0,
  ranking_position   INTEGER,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT individual_standings_unique UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_individual_standings_tournament ON individual_standings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_individual_standings_player     ON individual_standings(player_id);
CREATE INDEX IF NOT EXISTS idx_individual_standings_team       ON individual_standings(team_id);

-- ============================================================
-- TABLA: pairing_history
-- Historial de compañeros y rivales para el algoritmo
-- ============================================================
CREATE TABLE IF NOT EXISTS pairing_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id         UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_id              UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  partner_player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent_player_1_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  opponent_player_2_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pairing_history_tournament ON pairing_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_pairing_history_player     ON pairing_history(player_id);
CREATE INDEX IF NOT EXISTS idx_pairing_history_partner    ON pairing_history(partner_player_id);

-- ============================================================
-- TABLA: tournament_settings_audit
-- Registro de cambios de configuración (solo cuando status = 'draft')
-- ============================================================
CREATE TABLE IF NOT EXISTS tournament_settings_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  changed_by    UUID NOT NULL REFERENCES profiles(id),
  field_name    TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tournament_id ON tournament_settings_audit(tournament_id);
