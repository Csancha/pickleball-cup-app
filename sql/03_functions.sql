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
