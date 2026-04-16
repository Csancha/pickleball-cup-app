/**
 * Calculador de standings para torneos de pickleball
 *
 * Reglas de puntuación:
 * - Cada pareja suma los puntos anotados en el marcador
 * - La pareja ganadora suma 3 puntos extra al equipo (bonus)
 * - En empate: no hay bonus
 * - Standings individuales: solo puntos del marcador, SIN bonus
 *
 * Desempate individual (orden):
 * 1. Más victorias
 * 2. Mejor diferencia de puntos
 * 3. Más puntos en la última ronda
 * 4. Menos descansos
 */

import type {
  StandingsCalculation,
  IndividualStandingsCalculation,
} from "@/types";

// ============================================================
// TIPOS INTERNOS
// ============================================================

export interface MatchResult {
  matchId: string;
  roundId: string;
  roundNumber: number;
  teamAId: string;
  teamBId: string;
  teamAScore: number;
  teamBScore: number;
  teamABonus: number;
  teamBBonus: number;
  winnerTeamId: string | null;
  isDraw: boolean;
  status: string;
  // Jugadores de cada pareja
  pairA: { teamId: string; player1Id: string; player2Id: string };
  pairB: { teamId: string; player1Id: string; player2Id: string };
}

export interface PlayerByeInfo {
  playerId: string;
  teamId: string;
  roundId: string;
}

// ============================================================
// CÁLCULO DE STANDINGS DE EQUIPOS
// ============================================================

export function calculateTeamStandings(
  matches: MatchResult[],
  teamIds: string[]
): StandingsCalculation[] {
  const statsMap = new Map<string, StandingsCalculation>();

  // Inicializar todos los equipos
  for (const teamId of teamIds) {
    statsMap.set(teamId, {
      teamId,
      matchesPlayed: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      pointsScored: 0,
      bonusPoints: 0,
      totalPoints: 0,
    });
  }

  // Procesar solo partidos terminados
  const finishedMatches = matches.filter((m) => m.status === "finished");

  for (const match of finishedMatches) {
    const teamA = statsMap.get(match.teamAId);
    const teamB = statsMap.get(match.teamBId);
    if (!teamA || !teamB) continue;

    teamA.matchesPlayed++;
    teamB.matchesPlayed++;

    teamA.pointsScored += match.teamAScore;
    teamB.pointsScored += match.teamBScore;

    if (match.isDraw) {
      teamA.matchesDrawn++;
      teamB.matchesDrawn++;
    } else if (match.winnerTeamId === match.teamAId) {
      teamA.matchesWon++;
      teamB.matchesLost++;
      teamA.bonusPoints += match.teamABonus;
    } else if (match.winnerTeamId === match.teamBId) {
      teamB.matchesWon++;
      teamA.matchesLost++;
      teamB.bonusPoints += match.teamBBonus;
    }
  }

  // Calcular total_points = points_scored + bonus_points
  for (const stats of statsMap.values()) {
    stats.totalPoints = stats.pointsScored + stats.bonusPoints;
  }

  return [...statsMap.values()];
}

// ============================================================
// CÁLCULO DE STANDINGS INDIVIDUALES
// ============================================================

export function calculateIndividualStandings(
  matches: MatchResult[],
  byes: PlayerByeInfo[],
  playerIds: string[],
  playerTeamMap: Map<string, string>
): IndividualStandingsCalculation[] {
  const statsMap = new Map<string, IndividualStandingsCalculation>();

  // Inicializar todos los jugadores
  for (const playerId of playerIds) {
    const teamId = playerTeamMap.get(playerId) ?? "";
    statsMap.set(playerId, {
      playerId,
      teamId,
      matchesPlayed: 0,
      byes: 0,
      matchesWon: 0,
      matchesDrawn: 0,
      matchesLost: 0,
      pointsScored: 0,
      pointsConceded: 0,
      pointDifference: 0,
    });
  }

  // Contar byes
  for (const bye of byes) {
    const stats = statsMap.get(bye.playerId);
    if (stats) stats.byes++;
  }

  // Procesar partidos terminados
  const finishedMatches = matches.filter((m) => m.status === "finished");

  for (const match of finishedMatches) {
    const pairs = [match.pairA, match.pairB];

    for (const pair of pairs) {
      const isWinner = match.winnerTeamId === pair.teamId;
      const isLoser =
        !match.isDraw && match.winnerTeamId !== null && !isWinner;

      const myScore =
        pair.teamId === match.teamAId ? match.teamAScore : match.teamBScore;
      const theirScore =
        pair.teamId === match.teamAId ? match.teamBScore : match.teamAScore;

      const pairPlayerIds = [pair.player1Id, pair.player2Id];

      for (const playerId of pairPlayerIds) {
        const stats = statsMap.get(playerId);
        if (!stats) continue;

        stats.matchesPlayed++;
        stats.pointsScored += myScore;
        stats.pointsConceded += theirScore;

        if (match.isDraw) {
          stats.matchesDrawn++;
        } else if (isWinner) {
          stats.matchesWon++;
        } else if (isLoser) {
          stats.matchesLost++;
        }
      }
    }
  }

  // Calcular diferencia de puntos
  for (const stats of statsMap.values()) {
    stats.pointDifference = stats.pointsScored - stats.pointsConceded;
  }

  return [...statsMap.values()];
}

// ============================================================
// CÁLCULO DE RANKING INDIVIDUAL POR EQUIPO
// ============================================================

export interface PlayerLastRoundPoints {
  playerId: string;
  points: number;
}

export function rankPlayersWithinTeam(
  standings: IndividualStandingsCalculation[],
  lastRoundPoints: PlayerLastRoundPoints[]
): IndividualStandingsCalculation[] {
  const lastRoundMap = new Map(lastRoundPoints.map((p) => [p.playerId, p.points]));

  return [...standings].sort((a, b) => {
    // 1. Más victorias
    if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
    // 2. Mejor diferencia de puntos
    if (a.pointDifference !== b.pointDifference)
      return b.pointDifference - a.pointDifference;
    // 3. Más puntos en la última ronda
    const aLast = lastRoundMap.get(a.playerId) ?? 0;
    const bLast = lastRoundMap.get(b.playerId) ?? 0;
    if (aLast !== bLast) return bLast - aLast;
    // 4. Menos descansos
    if (a.byes !== b.byes) return a.byes - b.byes;
    // 5. Aleatorio (el admin puede ajustar manualmente)
    return 0;
  });
}

// ============================================================
// DETERMINAR RESULTADO DEL PARTIDO
// ============================================================

export function determineMatchResult(
  teamAScore: number,
  teamBScore: number,
  teamAId: string,
  teamBId: string
): {
  winnerTeamId: string | null;
  isDraw: boolean;
  teamABonus: number;
  teamBBonus: number;
} {
  const WINNER_BONUS = 3;

  if (teamAScore > teamBScore) {
    return {
      winnerTeamId: teamAId,
      isDraw: false,
      teamABonus: WINNER_BONUS,
      teamBBonus: 0,
    };
  } else if (teamBScore > teamAScore) {
    return {
      winnerTeamId: teamBId,
      isDraw: false,
      teamABonus: 0,
      teamBBonus: WINNER_BONUS,
    };
  } else {
    return {
      winnerTeamId: null,
      isDraw: true,
      teamABonus: 0,
      teamBBonus: 0,
    };
  }
}
