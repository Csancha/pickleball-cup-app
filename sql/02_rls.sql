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
