"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTournamentSchema, submitResultSchema } from "@/lib/validations/tournament";
import { generateRound, generateFinalMatches } from "@/lib/pairing/algorithm";
import {
  calculateTeamStandings,
  calculateIndividualStandings,
  determineMatchResult,
  rankPlayersWithinTeam,
} from "@/lib/standings/calculator";
import type {
  ActionResult,
  CreateTournamentInput,
  PairingContext,
  PairingPlayer,
} from "@/types";
import type { MatchResult, PlayerByeInfo } from "@/lib/standings/calculator";

// ============================================================
// CREAR TORNEO
// ============================================================
export async function createTournament(
  input: CreateTournamentInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = createTournamentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(". "),
    };
  }

  const data = parsed.data;

  const { data: tournament, error } = await supabase
    .from("tournaments")
    .insert({
      name: data.name,
      total_players: data.total_players,
      total_teams: data.total_teams,
      players_per_team: data.players_per_team,
      total_courts: data.total_courts,
      match_duration_minutes: data.match_duration_minutes,
      total_league_rounds: data.total_league_rounds,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Crear equipos por defecto con nombres genéricos
  const teamNames = generateTeamNames(data.total_teams);
  const teamColors = generateTeamColors(data.total_teams);

  const teamsInsert = teamNames.map((name, idx) => ({
    tournament_id: tournament.id,
    name,
    color: teamColors[idx],
  }));

  const { error: teamsError } = await supabase.from("teams").insert(teamsInsert);
  if (teamsError) return { success: false, error: teamsError.message };

  // Crear registros de standings vacíos por equipo
  const { data: teamsCreated } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournament.id);

  if (teamsCreated) {
    const standingsInsert = teamsCreated.map((t) => ({
      tournament_id: tournament.id,
      team_id: t.id,
    }));
    await supabase.from("team_standings").insert(standingsInsert);
  }

  revalidatePath("/admin");
  return { success: true, data: { id: tournament.id } };
}

// ============================================================
// ACTIVAR TORNEO
// ============================================================
export async function activateTournament(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autenticado" };

  // Obtener torneo
  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*, tournament_players(id, team_id)")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { success: false, error: "Torneo no encontrado" };
  if (tournament.status !== "draft")
    return { success: false, error: "El torneo no está en borrador" };

  // Validar número de jugadores
  const assignedPlayers = tournament.tournament_players?.length ?? 0;
  if (assignedPlayers !== tournament.total_players) {
    return {
      success: false,
      error: `Faltan jugadores. Tienes ${assignedPlayers}/${tournament.total_players}`,
    };
  }

  // Validar que cada equipo tiene el número correcto
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournamentId);

  if (!teams) return { success: false, error: "Error al obtener equipos" };

  for (const team of teams) {
    const { count } = await supabase
      .from("tournament_players")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("team_id", team.id);

    if (count !== tournament.players_per_team) {
      return {
        success: false,
        error: `El equipo "${team.name}" tiene ${count}/${tournament.players_per_team} jugadores`,
      };
    }
  }

  // Activar
  const { error } = await supabase
    .from("tournaments")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", tournamentId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/tournament/${tournamentId}`);
  return { success: true, data: undefined };
}

// ============================================================
// GENERAR RONDAS DE LA FASE LIGA
// ============================================================
export async function generateLeagueRounds(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { success: false, error: "Torneo no encontrado" };
  if (tournament.status !== "active") {
    return { success: false, error: "El torneo debe estar activo para generar rondas" };
  }

  // Verificar que no haya rondas ya generadas
  const { count: existingRounds } = await supabase
    .from("rounds")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("phase", "league");

  if ((existingRounds ?? 0) > 0) {
    return { success: false, error: "Las rondas ya han sido generadas" };
  }

  // Obtener jugadores del torneo con sus equipos
  const { data: tournamentPlayers } = await supabase
    .from("tournament_players")
    .select("player_id, team_id, total_byes")
    .eq("tournament_id", tournamentId)
    .eq("is_active", true);

  if (!tournamentPlayers || tournamentPlayers.length === 0) {
    return { success: false, error: "No hay jugadores en el torneo" };
  }

  // Inicializar estado del historial
  const partnerHistory = new Map<string, string[]>();
  const opponentHistory = new Map<string, string[]>();

  for (const tp of tournamentPlayers) {
    partnerHistory.set(tp.player_id, []);
    opponentHistory.set(tp.player_id, []);
  }

  // Generar todas las rondas
  for (let roundNum = 1; roundNum <= tournament.total_league_rounds; roundNum++) {
    const players: PairingPlayer[] = tournamentPlayers.map((tp) => ({
      id: tp.player_id,
      teamId: tp.team_id,
      totalByes: tp.total_byes,
      partnerHistory: partnerHistory.get(tp.player_id) ?? [],
      opponentHistory: opponentHistory.get(tp.player_id) ?? [],
    }));

    const context: PairingContext = {
      tournamentId,
      tournamentConfig: {
        totalPlayers: tournament.total_players,
        totalTeams: tournament.total_teams,
        playersPerTeam: tournament.players_per_team,
        totalCourts: tournament.total_courts,
        simultaneousPlayers: tournament.simultaneous_players,
      },
      players,
      roundNumber: roundNum,
    };

    const generatedRound = generateRound(context);

    // Insertar ronda
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        tournament_id: tournamentId,
        round_number: roundNum,
        phase: "league",
        status: roundNum === 1 ? "active" : "pending",
      })
      .select("id")
      .single();

    if (roundError || !round)
      return { success: false, error: `Error creando ronda ${roundNum}: ${roundError?.message}` };

    // Insertar byes
    if (generatedRound.byes.length > 0) {
      const byesInsert = generatedRound.byes.map((b) => ({
        tournament_id: tournamentId,
        round_id: round.id,
        player_id: b.playerId,
        team_id: b.teamId,
      }));
      await supabase.from("round_byes").insert(byesInsert);
    }

    // Insertar partidos, match_pairs y match_pair_players
    for (const match of generatedRound.matches) {
      const { data: matchRecord, error: matchError } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          round_id: round.id,
          phase: "league",
          court_number: match.courtNumber,
          match_order: match.courtNumber,
          team_a_id: match.pairA.teamId,
          team_b_id: match.pairB.teamId,
        })
        .select("id")
        .single();

      if (matchError || !matchRecord) continue;

      // Pareja A
      const { data: pairARecord } = await supabase
        .from("match_pairs")
        .insert({ match_id: matchRecord.id, team_id: match.pairA.teamId })
        .select("id")
        .single();

      if (pairARecord) {
        await supabase.from("match_pair_players").insert([
          { match_pair_id: pairARecord.id, player_id: match.pairA.player1Id },
          { match_pair_id: pairARecord.id, player_id: match.pairA.player2Id },
        ]);
      }

      // Pareja B
      const { data: pairBRecord } = await supabase
        .from("match_pairs")
        .insert({ match_id: matchRecord.id, team_id: match.pairB.teamId })
        .select("id")
        .single();

      if (pairBRecord) {
        await supabase.from("match_pair_players").insert([
          { match_pair_id: pairBRecord.id, player_id: match.pairB.player1Id },
          { match_pair_id: pairBRecord.id, player_id: match.pairB.player2Id },
        ]);
      }

      // Insertar en pairing_history
      const pairingEntries = [
        {
          tournament_id: tournamentId,
          round_id: round.id,
          player_id: match.pairA.player1Id,
          partner_player_id: match.pairA.player2Id,
          opponent_player_1_id: match.pairB.player1Id,
          opponent_player_2_id: match.pairB.player2Id,
        },
        {
          tournament_id: tournamentId,
          round_id: round.id,
          player_id: match.pairA.player2Id,
          partner_player_id: match.pairA.player1Id,
          opponent_player_1_id: match.pairB.player1Id,
          opponent_player_2_id: match.pairB.player2Id,
        },
        {
          tournament_id: tournamentId,
          round_id: round.id,
          player_id: match.pairB.player1Id,
          partner_player_id: match.pairB.player2Id,
          opponent_player_1_id: match.pairA.player1Id,
          opponent_player_2_id: match.pairA.player2Id,
        },
        {
          tournament_id: tournamentId,
          round_id: round.id,
          player_id: match.pairB.player2Id,
          partner_player_id: match.pairB.player1Id,
          opponent_player_1_id: match.pairA.player1Id,
          opponent_player_2_id: match.pairA.player2Id,
        },
      ];
      await supabase.from("pairing_history").insert(pairingEntries);

      // Actualizar historial para las próximas rondas
      updateHistory(
        partnerHistory,
        opponentHistory,
        match.pairA.player1Id,
        match.pairA.player2Id,
        match.pairB.player1Id,
        match.pairB.player2Id
      );
    }

    // Actualizar total_byes en tournament_players
    for (const bye of generatedRound.byes) {
      await supabase.rpc("increment_player_byes", {
        p_tournament_id: tournamentId,
        p_player_id: bye.playerId,
      });
    }
  }

  revalidatePath(`/admin/tournament/${tournamentId}`);
  return { success: true, data: undefined };
}

// ============================================================
// INTRODUCIR RESULTADO DE PARTIDO
// ============================================================
export async function submitMatchResult(
  input: { match_id: string; team_a_score: number; team_b_score: number }
): Promise<ActionResult> {
  const supabase = await createClient();

  const parsed = submitResultSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(". "),
    };
  }

  const { match_id, team_a_score, team_b_score } = parsed.data;

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", match_id)
    .single();

  if (!match) return { success: false, error: "Partido no encontrado" };

  const result = determineMatchResult(
    team_a_score,
    team_b_score,
    match.team_a_id,
    match.team_b_id
  );

  const { error } = await supabase
    .from("matches")
    .update({
      team_a_score,
      team_b_score,
      team_a_bonus: result.teamABonus,
      team_b_bonus: result.teamBBonus,
      winner_team_id: result.winnerTeamId,
      is_draw: result.isDraw,
      status: "finished",
    })
    .eq("id", match_id);

  if (error) return { success: false, error: error.message };

  // Recalcular standings automáticamente
  await recalculateStandings(match.tournament_id);

  // Actualizar total_matches_played
  await updateMatchesPlayed(supabase, match.tournament_id, match_id);

  revalidatePath(`/admin/tournament/${match.tournament_id}`);
  return { success: true, data: undefined };
}

// ============================================================
// RECALCULAR STANDINGS
// ============================================================
export async function recalculateStandings(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Obtener todos los partidos terminados con sus parejas
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id, round_id, team_a_id, team_b_id, team_a_score, team_b_score,
      team_a_bonus, team_b_bonus, winner_team_id, is_draw, status,
      rounds!inner(round_number),
      match_pairs(
        id, team_id,
        match_pair_players(player_id)
      )
    `)
    .eq("tournament_id", tournamentId)
    .eq("phase", "league");

  if (!matches) return { success: false, error: "Error al obtener partidos" };

  // Transformar a MatchResult
  const matchResults: MatchResult[] = matches.map((m) => {
    const pairs = m.match_pairs ?? [];
    const pairA = pairs.find((p: { team_id: string }) => p.team_id === m.team_a_id);
    const pairB = pairs.find((p: { team_id: string }) => p.team_id === m.team_b_id);

    return {
      matchId: m.id,
      roundId: m.round_id,
      roundNumber: (m.rounds as unknown as { round_number: number }).round_number,
      teamAId: m.team_a_id,
      teamBId: m.team_b_id,
      teamAScore: m.team_a_score,
      teamBScore: m.team_b_score,
      teamABonus: m.team_a_bonus,
      teamBBonus: m.team_b_bonus,
      winnerTeamId: m.winner_team_id,
      isDraw: m.is_draw,
      status: m.status,
      pairA: {
        teamId: m.team_a_id,
        player1Id: pairA?.match_pair_players?.[0]?.player_id ?? "",
        player2Id: pairA?.match_pair_players?.[1]?.player_id ?? "",
      },
      pairB: {
        teamId: m.team_b_id,
        player1Id: pairB?.match_pair_players?.[0]?.player_id ?? "",
        player2Id: pairB?.match_pair_players?.[1]?.player_id ?? "",
      },
    };
  });

  // Obtener equipos
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId);

  const teamIds = (teams ?? []).map((t: { id: string }) => t.id);

  // Calcular team standings
  const teamStats = calculateTeamStandings(matchResults, teamIds);

  for (const stats of teamStats) {
    await supabase
      .from("team_standings")
      .upsert(
        {
          tournament_id: tournamentId,
          team_id: stats.teamId,
          matches_played: stats.matchesPlayed,
          matches_won: stats.matchesWon,
          matches_drawn: stats.matchesDrawn,
          matches_lost: stats.matchesLost,
          points_scored: stats.pointsScored,
          bonus_points: stats.bonusPoints,
          total_points: stats.totalPoints,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tournament_id,team_id" }
      );
  }

  // Obtener jugadores y sus equipos
  const { data: tournamentPlayers } = await supabase
    .from("tournament_players")
    .select("player_id, team_id")
    .eq("tournament_id", tournamentId);

  const playerIds = (tournamentPlayers ?? []).map((tp: { player_id: string }) => tp.player_id);
  const playerTeamMap = new Map(
    (tournamentPlayers ?? []).map((tp: { player_id: string; team_id: string }) => [tp.player_id, tp.team_id])
  );

  // Obtener byes
  const { data: byes } = await supabase
    .from("round_byes")
    .select("player_id, team_id, round_id")
    .eq("tournament_id", tournamentId);

  const byeInfos: PlayerByeInfo[] = (byes ?? []).map((b: { player_id: string; team_id: string; round_id: string }) => ({
    playerId: b.player_id,
    teamId: b.team_id,
    roundId: b.round_id,
  }));

  // Calcular individual standings
  const individualStats = calculateIndividualStandings(
    matchResults,
    byeInfos,
    playerIds,
    playerTeamMap
  );

  // Calcular última ronda jugada para desempate
  const lastRoundPoints = getLastRoundPoints(matchResults, playerIds);

  // Rankear por equipo
  const playersByTeam = new Map<string, typeof individualStats>();
  for (const stats of individualStats) {
    const list = playersByTeam.get(stats.teamId) ?? [];
    list.push(stats);
    playersByTeam.set(stats.teamId, list);
  }

  const allRanked: (typeof individualStats[0] & { rankingPosition: number })[] = [];
  for (const [, players] of playersByTeam) {
    const ranked = rankPlayersWithinTeam(players, lastRoundPoints);
    ranked.forEach((p, idx) => {
      allRanked.push({ ...p, rankingPosition: idx + 1 });
    });
  }

  for (const stats of allRanked) {
    await supabase
      .from("individual_standings")
      .upsert(
        {
          tournament_id: tournamentId,
          team_id: stats.teamId,
          player_id: stats.playerId,
          matches_played: stats.matchesPlayed,
          byes: stats.byes,
          matches_won: stats.matchesWon,
          matches_drawn: stats.matchesDrawn,
          matches_lost: stats.matchesLost,
          points_scored: stats.pointsScored,
          points_conceded: stats.pointsConceded,
          point_difference: stats.pointDifference,
          ranking_position: stats.rankingPosition,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tournament_id,player_id" }
      );
  }

  return { success: true, data: undefined };
}

// ============================================================
// CERRAR FASE LIGA Y GENERAR FASE FINAL
// ============================================================
export async function closeLeagueAndGenerateFinals(
  tournamentId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .single();

  if (!tournament) return { success: false, error: "Torneo no encontrado" };
  if (tournament.status !== "active") {
    return { success: false, error: "El torneo debe estar activo" };
  }

  // Verificar que todas las rondas de liga están terminadas
  const { data: pendingRounds } = await supabase
    .from("rounds")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("phase", "league")
    .neq("status", "finished");

  if (pendingRounds && pendingRounds.length > 0) {
    return {
      success: false,
      error: `Hay ${pendingRounds.length} rondas de liga sin terminar`,
    };
  }

  // Recalcular standings finales de liga
  await recalculateStandings(tournamentId);

  // Obtener clasificación individual por equipo para la fase final
  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (!teams || teams.length < 2) {
    return { success: false, error: "Se necesitan al menos 2 equipos" };
  }

  // Obtener rankings individuales por equipo
  const teamPlayerRankings = new Map<string, { playerId: string; rankingPosition: number }[]>();

  for (const team of teams) {
    const { data: standings } = await supabase
      .from("individual_standings")
      .select("player_id, ranking_position")
      .eq("tournament_id", tournamentId)
      .eq("team_id", team.id)
      .order("ranking_position", { ascending: true });

    teamPlayerRankings.set(
      team.id,
      (standings ?? []).map((s: { player_id: string; ranking_position: number | null }) => ({
        playerId: s.player_id,
        rankingPosition: s.ranking_position ?? 999,
      }))
    );
  }

  // Para 2 equipos: generar partidos de fase final
  if (teams.length === 2) {
    const teamAId = teams[0].id;
    const teamBId = teams[1].id;

    const teamAPlayers = (teamPlayerRankings.get(teamAId) ?? []).map((p) => ({
      ...p,
      teamId: teamAId,
    }));
    const teamBPlayers = (teamPlayerRankings.get(teamBId) ?? []).map((p) => ({
      ...p,
      teamId: teamBId,
    }));

    const finalMatches = generateFinalMatches(
      teamAPlayers,
      teamBPlayers,
      tournament.total_courts
    );

    // Crear ronda de finales
    const { data: finalRound, error: roundError } = await supabase
      .from("rounds")
      .insert({
        tournament_id: tournamentId,
        round_number: 1,
        phase: "finals",
        status: "active",
      })
      .select("id")
      .single();

    if (roundError || !finalRound) {
      return { success: false, error: `Error creando ronda final: ${roundError?.message}` };
    }

    // Insertar partidos finales
    for (const match of finalMatches) {
      const { data: matchRecord } = await supabase
        .from("matches")
        .insert({
          tournament_id: tournamentId,
          round_id: finalRound.id,
          phase: "finals",
          court_number: match.courtNumber,
          match_order: match.courtNumber,
          team_a_id: match.pairA.teamId,
          team_b_id: match.pairB.teamId,
        })
        .select("id")
        .single();

      if (!matchRecord) continue;

      const { data: pairA } = await supabase
        .from("match_pairs")
        .insert({ match_id: matchRecord.id, team_id: match.pairA.teamId })
        .select("id")
        .single();

      if (pairA) {
        await supabase.from("match_pair_players").insert([
          { match_pair_id: pairA.id, player_id: match.pairA.player1Id },
          { match_pair_id: pairA.id, player_id: match.pairA.player2Id },
        ]);
      }

      const { data: pairB } = await supabase
        .from("match_pairs")
        .insert({ match_id: matchRecord.id, team_id: match.pairB.teamId })
        .select("id")
        .single();

      if (pairB) {
        await supabase.from("match_pair_players").insert([
          { match_pair_id: pairB.id, player_id: match.pairB.player1Id },
          { match_pair_id: pairB.id, player_id: match.pairB.player2Id },
        ]);
      }
    }
  }

  // Actualizar estado del torneo
  await supabase
    .from("tournaments")
    .update({
      status: "finals_active",
      current_phase: "finals",
    })
    .eq("id", tournamentId);

  revalidatePath(`/admin/tournament/${tournamentId}`);
  return { success: true, data: undefined };
}

// ============================================================
// MARCAR CAMPEÓN
// ============================================================
export async function determineChampion(
  tournamentId: string
): Promise<ActionResult<{ championTeamId: string }>> {
  const supabase = await createClient();

  // Obtener todos los partidos de la fase final terminados
  const { data: finalMatches } = await supabase
    .from("matches")
    .select("winner_team_id, is_draw, team_a_id, team_b_id")
    .eq("tournament_id", tournamentId)
    .eq("phase", "finals")
    .eq("status", "finished");

  if (!finalMatches || finalMatches.length === 0) {
    return { success: false, error: "No hay partidos de final terminados" };
  }

  // Contar victorias por equipo
  const wins = new Map<string, number>();
  for (const match of finalMatches) {
    if (!match.is_draw && match.winner_team_id) {
      wins.set(
        match.winner_team_id,
        (wins.get(match.winner_team_id) ?? 0) + 1
      );
    }
  }

  // El campeón es el equipo con más victorias
  let championTeamId = "";
  let maxWins = -1;

  for (const [teamId, w] of wins) {
    if (w > maxWins) {
      maxWins = w;
      championTeamId = teamId;
    }
  }

  if (!championTeamId) {
    return { success: false, error: "No se puede determinar el campeón (empate)" };
  }

  await supabase
    .from("tournaments")
    .update({ status: "finished", finished_at: new Date().toISOString() })
    .eq("id", tournamentId);

  revalidatePath(`/admin/tournament/${tournamentId}`);
  return { success: true, data: { championTeamId } };
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

function generateTeamNames(count: number): string[] {
  const defaultNames = [
    "Equipo Verde", "Equipo Azul", "Equipo Rojo", "Equipo Amarillo",
    "Equipo Naranja", "Equipo Morado", "Equipo Negro", "Equipo Blanco",
  ];
  return Array.from({ length: count }, (_, i) => defaultNames[i] ?? `Equipo ${i + 1}`);
}

function generateTeamColors(count: number): string[] {
  const colors = [
    "#22c55e", "#3b82f6", "#ef4444", "#eab308",
    "#f97316", "#a855f7", "#1f2937", "#e5e7eb",
  ];
  return Array.from({ length: count }, (_, i) => colors[i] ?? "#6b7280");
}

function updateHistory(
  partnerHistory: Map<string, string[]>,
  opponentHistory: Map<string, string[]>,
  p1: string, p2: string, p3: string, p4: string
) {
  const addTo = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  };

  addTo(partnerHistory, p1, p2);
  addTo(partnerHistory, p2, p1);
  addTo(partnerHistory, p3, p4);
  addTo(partnerHistory, p4, p3);

  addTo(opponentHistory, p1, p3);
  addTo(opponentHistory, p1, p4);
  addTo(opponentHistory, p2, p3);
  addTo(opponentHistory, p2, p4);
  addTo(opponentHistory, p3, p1);
  addTo(opponentHistory, p3, p2);
  addTo(opponentHistory, p4, p1);
  addTo(opponentHistory, p4, p2);
}

function getLastRoundPoints(
  matches: MatchResult[],
  playerIds: string[]
): { playerId: string; points: number }[] {
  if (matches.length === 0) return playerIds.map((id) => ({ playerId: id, points: 0 }));

  const maxRound = Math.max(...matches.map((m) => m.roundNumber));
  const lastRoundMatches = matches.filter(
    (m) => m.roundNumber === maxRound && m.status === "finished"
  );

  const pointsMap = new Map<string, number>();

  for (const match of lastRoundMatches) {
    const pairs = [match.pairA, match.pairB];
    for (const pair of pairs) {
      const score = pair.teamId === match.teamAId ? match.teamAScore : match.teamBScore;
      for (const pid of [pair.player1Id, pair.player2Id]) {
        if (pid) pointsMap.set(pid, score);
      }
    }
  }

  return playerIds.map((id) => ({ playerId: id, points: pointsMap.get(id) ?? 0 }));
}

async function updateMatchesPlayed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  matchId: string
) {
  const { data: match } = await supabase
    .from("matches")
    .select(`
      match_pairs(
        match_pair_players(player_id)
      )
    `)
    .eq("id", matchId)
    .single();

  if (!match) return;

  const playerIds = (match.match_pairs ?? []).flatMap(
    (pair: { match_pair_players: { player_id: string }[] }) =>
      pair.match_pair_players.map((p) => p.player_id)
  );

  for (const playerId of playerIds) {
    const { data: tp } = await supabase
      .from("tournament_players")
      .select("total_matches_played")
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId)
      .single();

    if (tp) {
      await supabase
        .from("tournament_players")
        .update({ total_matches_played: tp.total_matches_played + 1 })
        .eq("tournament_id", tournamentId)
        .eq("player_id", playerId);
    }
  }
}
