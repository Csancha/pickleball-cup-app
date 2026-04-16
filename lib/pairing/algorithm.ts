/**
 * Algoritmo de generación de emparejamientos para torneos de pickleball
 *
 * Prioridades:
 * 1. Repartir descansos (byes) equitativamente
 * 2. Evitar repetir compañero
 * 3. Evitar repetir enfrentamiento contra la misma pareja rival
 * 4. Repartir variedad de rivales individuales
 */

import type {
  PairingContext,
  PairingPlayer,
  GeneratedRound,
  GeneratedMatch,
  PlayerPair,
  ByeAssignment,
} from "@/types";

// ============================================================
// TIPOS INTERNOS DEL ALGORITMO
// ============================================================

interface PlayerState extends PairingPlayer {
  byeCount: number;
  partnerCount: Map<string, number>;
  opponentCount: Map<string, number>;
}

interface PairCandidate {
  player1: PlayerState;
  player2: PlayerState;
  score: number; // menor es mejor
}

// ============================================================
// FUNCIÓN PRINCIPAL
// ============================================================

export function generateRound(context: PairingContext): GeneratedRound {
  const { tournamentConfig, players, roundNumber } = context;
  const {
    totalCourts,
    simultaneousPlayers,
    totalPlayers,
  } = tournamentConfig;

  // Normalizar estado de jugadores
  const playerStates: Map<string, PlayerState> = new Map(
    players.map((p) => [
      p.id,
      {
        ...p,
        byeCount: p.totalByes,
        partnerCount: buildCountMap(p.partnerHistory),
        opponentCount: buildCountMap(p.opponentHistory),
      },
    ])
  );

  const allPlayers = Array.from(playerStates.values());
  const byeCount = Math.max(0, totalPlayers - simultaneousPlayers);

  // 1. Seleccionar quién descansa
  const byePlayers = selectByePlayers(allPlayers, byeCount);
  const byePlayerIds = new Set(byePlayers.map((p) => p.id));

  // 2. Jugadores activos esta ronda
  const activePlayers = allPlayers.filter((p) => !byePlayerIds.has(p.id));

  // 3. Generar emparejamientos para los jugadores activos
  const matches = generateMatches(activePlayers, totalCourts, roundNumber);

  // 4. Construir resultado
  const generatedByes: ByeAssignment[] = byePlayers.map((p) => ({
    playerId: p.id,
    teamId: p.teamId,
  }));

  return { matches, byes: generatedByes };
}

// ============================================================
// SELECCIÓN DE DESCANSOS
// ============================================================

function selectByePlayers(
  players: PlayerState[],
  count: number
): PlayerState[] {
  if (count <= 0) return [];

  // Ordenar: primero los que menos han descansado, desempate aleatorio
  const sorted = [...players].sort((a, b) => {
    if (a.byeCount !== b.byeCount) return a.byeCount - b.byeCount;
    return Math.random() - 0.5;
  });

  return sorted.slice(0, count);
}

// ============================================================
// GENERACIÓN DE PARTIDOS
// ============================================================

function generateMatches(
  activePlayers: PlayerState[],
  totalCourts: number,
  roundNumber: number
): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];
  const usedInThisRound = new Set<string>();

  // Agrupar jugadores por equipo
  const playersByTeam = groupByTeam(activePlayers);
  const teams = Array.from(playersByTeam.keys());

  // Intentar generar hasta totalCourts partidos
  for (let courtIndex = 0; courtIndex < totalCourts; courtIndex++) {
    const availablePlayers = activePlayers.filter(
      (p) => !usedInThisRound.has(p.id)
    );

    if (availablePlayers.length < 4) break;

    const match = tryGenerateMatch(availablePlayers, teams, usedInThisRound);
    if (match) {
      matches.push({ ...match, courtNumber: courtIndex + 1 });
      usedInThisRound.add(match.pairA.player1Id);
      usedInThisRound.add(match.pairA.player2Id);
      usedInThisRound.add(match.pairB.player1Id);
      usedInThisRound.add(match.pairB.player2Id);
    }
  }

  return matches;
}

function tryGenerateMatch(
  available: PlayerState[],
  teams: string[],
  usedIds: Set<string>
): Omit<GeneratedMatch, "courtNumber"> | null {
  // Intentar estrategia: equipos distintos se enfrentan
  // Primero buscar la mejor pareja del equipo A, luego del equipo B

  const shuffledTeams = shuffle([...teams]);

  for (let t = 0; t < shuffledTeams.length; t++) {
    const teamA = shuffledTeams[t];
    const teamBOptions = shuffledTeams.filter((_, i) => i !== t);

    const playersTeamA = available.filter(
      (p) => p.teamId === teamA && !usedIds.has(p.id)
    );

    if (playersTeamA.length < 2) continue;

    const bestPairA = selectBestPair(playersTeamA);
    if (!bestPairA) continue;

    for (const teamB of teamBOptions) {
      const playersTeamB = available.filter(
        (p) =>
          p.teamId === teamB &&
          !usedIds.has(p.id) &&
          p.id !== bestPairA.player1.id &&
          p.id !== bestPairA.player2.id
      );

      if (playersTeamB.length < 2) continue;

      const bestPairB = selectBestPairVsOpponents(playersTeamB, [
        bestPairA.player1,
        bestPairA.player2,
      ]);

      if (!bestPairB) continue;

      return {
        pairA: {
          teamId: teamA,
          player1Id: bestPairA.player1.id,
          player2Id: bestPairA.player2.id,
        },
        pairB: {
          teamId: teamB,
          player1Id: bestPairB.player1.id,
          player2Id: bestPairB.player2.id,
        },
      };
    }
  }

  // Fallback: si no se pueden equilibrar equipos, mezclar disponibles
  return fallbackMatch(available, usedIds);
}

// ============================================================
// SELECCIÓN DE MEJOR PAREJA
// ============================================================

function selectBestPair(players: PlayerState[]): PairCandidate | null {
  if (players.length < 2) return null;

  const candidates: PairCandidate[] = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      const score = computePairScore(p1, p2);
      candidates.push({ player1: p1, player2: p2, score });
    }
  }

  if (candidates.length === 0) return null;

  // Ordenar por score (menor = mejor), añadir algo de aleatoriedad a iguales
  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return Math.random() - 0.5;
  });

  return candidates[0];
}

function selectBestPairVsOpponents(
  players: PlayerState[],
  opponents: PlayerState[]
): PairCandidate | null {
  if (players.length < 2) return null;

  const candidates: PairCandidate[] = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];
      const pairScore = computePairScore(p1, p2);
      const opponentScore = computeOpponentScore([p1, p2], opponents);
      candidates.push({
        player1: p1,
        player2: p2,
        score: pairScore + opponentScore,
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    return Math.random() - 0.5;
  });

  return candidates[0];
}

// ============================================================
// SCORING
// ============================================================

function computePairScore(p1: PlayerState, p2: PlayerState): number {
  // Penalizar si ya han sido compañeros
  const timesAsPartners =
    (p1.partnerCount.get(p2.id) ?? 0) + (p2.partnerCount.get(p1.id) ?? 0);
  return timesAsPartners * 10;
}

function computeOpponentScore(
  pair: PlayerState[],
  opponents: PlayerState[]
): number {
  let score = 0;
  for (const player of pair) {
    for (const opp of opponents) {
      // Penalizar si ya se han enfrentado
      score += (player.opponentCount.get(opp.id) ?? 0) * 5;
    }
  }
  return score;
}

// ============================================================
// FALLBACK: mezcla sin restricciones de equipo
// ============================================================

function fallbackMatch(
  available: PlayerState[],
  usedIds: Set<string>
): Omit<GeneratedMatch, "courtNumber"> | null {
  const free = available.filter((p) => !usedIds.has(p.id));
  if (free.length < 4) return null;

  const shuffled = shuffle([...free]);

  return {
    pairA: {
      teamId: shuffled[0].teamId,
      player1Id: shuffled[0].id,
      player2Id: shuffled[1].id,
    },
    pairB: {
      teamId: shuffled[2].teamId,
      player1Id: shuffled[2].id,
      player2Id: shuffled[3].id,
    },
  };
}

// ============================================================
// UTILIDADES
// ============================================================

function buildCountMap(history: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of history) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function groupByTeam(players: PlayerState[]): Map<string, PlayerState[]> {
  const map = new Map<string, PlayerState[]>();
  for (const p of players) {
    const list = map.get(p.teamId) ?? [];
    list.push(p);
    map.set(p.teamId, list);
  }
  return map;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// GENERADOR DE FASE FINAL
// ============================================================

export interface FinalRoundPlayer {
  playerId: string;
  teamId: string;
  rankingPosition: number;
}

export function generateFinalMatches(
  teamAPlayers: FinalRoundPlayer[],
  teamBPlayers: FinalRoundPlayer[],
  totalCourts: number
): GeneratedMatch[] {
  // Ordenar por ranking dentro de cada equipo
  const sortedA = [...teamAPlayers].sort(
    (a, b) => a.rankingPosition - b.rankingPosition
  );
  const sortedB = [...teamBPlayers].sort(
    (a, b) => a.rankingPosition - b.rankingPosition
  );

  // Formar parejas consecutivas por ranking: 1+2, 3+4, 5+6...
  const pairsA = formConsecutivePairs(sortedA);
  const pairsB = formConsecutivePairs(sortedB);

  const matchCount = Math.min(pairsA.length, pairsB.length, totalCourts);
  const matches: GeneratedMatch[] = [];

  for (let i = 0; i < matchCount; i++) {
    matches.push({
      courtNumber: i + 1,
      pairA: {
        teamId: pairsA[i][0].teamId,
        player1Id: pairsA[i][0].playerId,
        player2Id: pairsA[i][1].playerId,
      },
      pairB: {
        teamId: pairsB[i][0].teamId,
        player1Id: pairsB[i][0].playerId,
        player2Id: pairsB[i][1].playerId,
      },
    });
  }

  return matches;
}

function formConsecutivePairs<T>(players: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i + 1 < players.length; i += 2) {
    pairs.push([players[i], players[i + 1]]);
  }
  return pairs;
}
