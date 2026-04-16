export * from "./database";

// ============================================================
// Tipos de formulario / entrada
// ============================================================

export interface CreateTournamentInput {
  name: string;
  total_players: number;
  total_teams: number;
  players_per_team: number;
  total_courts: number;
  match_duration_minutes: number;
  total_league_rounds: number;
}

export interface CreatePlayerInput {
  display_name: string;
  phone?: string;
  avatar_url?: string;
}

export interface AssignPlayerInput {
  player_id: string;
  team_id: string;
  seed_order?: number;
}

export interface SubmitMatchResultInput {
  match_id: string;
  team_a_score: number;
  team_b_score: number;
}

// ============================================================
// Tipos del algoritmo de emparejamientos
// ============================================================

export interface PairingContext {
  tournamentId: string;
  tournamentConfig: {
    totalPlayers: number;
    totalTeams: number;
    playersPerTeam: number;
    totalCourts: number;
    simultaneousPlayers: number;
  };
  players: PairingPlayer[];
  roundNumber: number;
}

export interface PairingPlayer {
  id: string;
  teamId: string;
  totalByes: number;
  partnerHistory: string[]; // IDs de compañeros anteriores
  opponentHistory: string[]; // IDs de rivales anteriores
}

export interface GeneratedRound {
  matches: GeneratedMatch[];
  byes: ByeAssignment[];
}

export interface GeneratedMatch {
  courtNumber: number;
  pairA: PlayerPair;
  pairB: PlayerPair;
}

export interface PlayerPair {
  teamId: string;
  player1Id: string;
  player2Id: string;
}

export interface ByeAssignment {
  playerId: string;
  teamId: string;
}

// ============================================================
// Tipos de standings calculados
// ============================================================

export interface StandingsCalculation {
  teamId: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  pointsScored: number;
  bonusPoints: number;
  totalPoints: number;
}

export interface IndividualStandingsCalculation {
  playerId: string;
  teamId: string;
  matchesPlayed: number;
  byes: number;
  matchesWon: number;
  matchesDrawn: number;
  matchesLost: number;
  pointsScored: number;
  pointsConceded: number;
  pointDifference: number;
  rankingPosition?: number;
}

// ============================================================
// Tipos de fase final
// ============================================================

export interface FinalPair {
  teamId: string;
  player1Id: string;
  player2Id: string;
  rankingPositions: [number, number]; // posiciones en el ranking del equipo
}

export interface FinalMatch {
  courtNumber: number;
  pairRankingSlot: number; // 1 = primer par de cada equipo, 2 = segundo par, etc.
  pairA: FinalPair;
  pairB: FinalPair;
}

// ============================================================
// Tipos de UI / Estado de la app
// ============================================================

export interface AppUser {
  profile: import("./database").Profile;
  player?: import("./database").Player;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
