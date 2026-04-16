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
-- ============================================================
-- POLÍTICAS RLS - Supabase Row Level Security
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_pairs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_pair_players         ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_byes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_standings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_standings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_history            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_settings_audit  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCIÓN HELPER: obtener el rol del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- FUNCIÓN HELPER: obtener el player_id del usuario actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_player_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM players WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- TABLA: profiles
-- ============================================================
-- Cualquier usuario autenticado puede leer todos los perfiles (para mostrar nombres)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuario solo puede insertar su propio perfil
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Cada usuario solo puede actualizar su propio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- TABLA: players
-- ============================================================
-- Todos los autenticados pueden leer jugadores
CREATE POLICY "players_select_authenticated"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- Admin puede crear jugadores
CREATE POLICY "players_insert_admin"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- Admin puede actualizar cualquier jugador; jugador solo el suyo
CREATE POLICY "players_update_admin_or_own"
  ON players FOR UPDATE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    OR profile_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    OR profile_id = auth.uid()
  );

-- Solo admin puede eliminar jugadores
CREATE POLICY "players_delete_admin"
  ON players FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: tournaments
-- ============================================================
-- Todos pueden leer torneos
CREATE POLICY "tournaments_select_authenticated"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin puede crear torneos
CREATE POLICY "tournaments_insert_admin"
  ON tournaments FOR INSERT
  TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND created_by = auth.uid()
  );

-- Solo admin puede actualizar torneos
CREATE POLICY "tournaments_update_admin"
  ON tournaments FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

-- Solo admin puede eliminar torneos (solo en draft)
CREATE POLICY "tournaments_delete_admin"
  ON tournaments FOR DELETE
  TO authenticated
  USING (
    get_my_role() = 'admin'
    AND status = 'draft'
  );

-- ============================================================
-- TABLA: teams
-- ============================================================
CREATE POLICY "teams_select_authenticated"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teams_insert_admin"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "teams_update_admin"
  ON teams FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "teams_delete_admin"
  ON teams FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: tournament_players
-- ============================================================
CREATE POLICY "tournament_players_select_authenticated"
  ON tournament_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tournament_players_insert_admin"
  ON tournament_players FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "tournament_players_update_admin"
  ON tournament_players FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "tournament_players_delete_admin"
  ON tournament_players FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: rounds
-- ============================================================
CREATE POLICY "rounds_select_authenticated"
  ON rounds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rounds_insert_admin"
  ON rounds FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "rounds_update_admin"
  ON rounds FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "rounds_delete_admin"
  ON rounds FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: matches
-- ============================================================
CREATE POLICY "matches_select_authenticated"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "matches_insert_admin"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "matches_update_admin"
  ON matches FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "matches_delete_admin"
  ON matches FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: match_pairs
-- ============================================================
CREATE POLICY "match_pairs_select_authenticated"
  ON match_pairs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_pairs_insert_admin"
  ON match_pairs FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "match_pairs_delete_admin"
  ON match_pairs FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: match_pair_players
-- ============================================================
CREATE POLICY "match_pair_players_select_authenticated"
  ON match_pair_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "match_pair_players_insert_admin"
  ON match_pair_players FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "match_pair_players_delete_admin"
  ON match_pair_players FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: round_byes
-- ============================================================
CREATE POLICY "round_byes_select_authenticated"
  ON round_byes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "round_byes_insert_admin"
  ON round_byes FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "round_byes_delete_admin"
  ON round_byes FOR DELETE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: team_standings
-- ============================================================
CREATE POLICY "team_standings_select_authenticated"
  ON team_standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "team_standings_insert_admin"
  ON team_standings FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "team_standings_update_admin"
  ON team_standings FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: individual_standings
-- ============================================================
CREATE POLICY "individual_standings_select_authenticated"
  ON individual_standings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "individual_standings_insert_admin"
  ON individual_standings FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "individual_standings_update_admin"
  ON individual_standings FOR UPDATE
  TO authenticated
  USING (get_my_role() = 'admin');

-- ============================================================
-- TABLA: pairing_history
-- ============================================================
CREATE POLICY "pairing_history_select_authenticated"
  ON pairing_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pairing_history_insert_admin"
  ON pairing_history FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- TABLA: tournament_settings_audit
-- ============================================================
CREATE POLICY "audit_select_admin"
  ON tournament_settings_audit FOR SELECT
  TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "audit_insert_admin"
  ON tournament_settings_audit FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- TRIGGER: Auto-crear perfil al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'jugador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Auto-actualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_players_updated_at
  BEFORE UPDATE ON tournament_players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rounds_updated_at
  BEFORE UPDATE ON rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- FUNCIONES RPC PARA SUPABASE
-- ============================================================

-- Incrementar byes de un jugador en un torneo
CREATE OR REPLACE FUNCTION increment_player_byes(
  p_tournament_id UUID,
  p_player_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tournament_players
  SET total_byes = total_byes + 1,
      updated_at = NOW()
  WHERE tournament_id = p_tournament_id
    AND player_id = p_player_id;
END;
$$;

-- Obtener estadísticas resumidas del torneo para el dashboard
CREATE OR REPLACE FUNCTION get_tournament_summary(p_tournament_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = p_tournament_id AND phase = 'league'),
    'finished_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = p_tournament_id AND status = 'finished' AND phase = 'league'),
    'total_rounds', (SELECT COUNT(*) FROM rounds WHERE tournament_id = p_tournament_id AND phase = 'league'),
    'finished_rounds', (SELECT COUNT(*) FROM rounds WHERE tournament_id = p_tournament_id AND status = 'finished' AND phase = 'league'),
    'total_players', (SELECT COUNT(*) FROM tournament_players WHERE tournament_id = p_tournament_id AND is_active = true)
  ) INTO result;

  RETURN result;
END;
$$;

-- Verificar que un partido puede cerrar su ronda
CREATE OR REPLACE FUNCTION check_round_completion(p_round_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO pending_count
  FROM matches
  WHERE round_id = p_round_id
    AND status != 'finished';

  RETURN pending_count = 0;
END;
$$;

-- Cerrar una ronda (marcar como finished)
CREATE OR REPLACE FUNCTION close_round(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar la ronda como terminada
  UPDATE rounds
  SET status = 'finished', updated_at = NOW()
  WHERE id = p_round_id;

  -- Activar la siguiente ronda (si existe)
  UPDATE rounds
  SET status = 'active', updated_at = NOW()
  WHERE tournament_id = (SELECT tournament_id FROM rounds WHERE id = p_round_id)
    AND phase = 'league'
    AND round_number = (
      SELECT round_number + 1
      FROM rounds
      WHERE id = p_round_id
    )
    AND status = 'pending';
END;
$$;
