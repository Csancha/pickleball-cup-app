// ============================================================
// Tipos alineados con el esquema de Supabase
// ============================================================

export type Role = "admin" | "jugador";
export type TournamentStatus =
  | "draft"
  | "active"
  | "league_finished"
  | "finals_active"
  | "finished";
export type TournamentPhase = "league" | "finals";
export type RoundStatus = "pending" | "active" | "finished";
export type MatchStatus = "pending" | "live" | "finished";

// ============================================================
// Tabla: profiles
// ============================================================
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: players
// ============================================================
export interface Player {
  id: string;
  profile_id: string | null;
  display_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: tournaments
// ============================================================
export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  current_phase: TournamentPhase;
  total_players: number;
  total_teams: number;
  players_per_team: number;
  total_courts: number;
  players_per_match: number;
  simultaneous_players: number; // columna generada
  total_league_rounds: number;
  match_duration_minutes: number;
  created_by: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: teams
// ============================================================
export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  color: string | null;
  rank_seed: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: tournament_players
// ============================================================
export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  team_id: string;
  seed_order: number | null;
  is_active: boolean;
  total_byes: number;
  total_matches_played: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: rounds
// ============================================================
export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  phase: TournamentPhase;
  status: RoundStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: matches
// ============================================================
export interface Match {
  id: string;
  tournament_id: string;
  round_id: string;
  phase: TournamentPhase;
  court_number: number;
  match_order: number;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number;
  team_b_score: number;
  team_a_bonus: number;
  team_b_bonus: number;
  winner_team_id: string | null;
  is_draw: boolean;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Tabla: match_pairs
// ============================================================
export interface MatchPair {
  id: string;
  match_id: string;
  team_id: string;
  pair_label: string | null;
  created_at: string;
}

// ============================================================
// Tabla: match_pair_players
// ============================================================
export interface MatchPairPlayer {
  id: string;
  match_pair_id: string;
  player_id: string;
  created_at: string;
}

// ============================================================
// Tabla: round_byes
// ============================================================
export interface RoundBye {
  id: string;
  tournament_id: string;
  round_id: string;
  player_id: string;
  team_id: string;
  created_at: string;
}

// ============================================================
// Tabla: team_standings
// ============================================================
export interface TeamStanding {
  id: string;
  tournament_id: string;
  team_id: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_scored: number;
  bonus_points: number;
  total_points: number;
  updated_at: string;
}

// ============================================================
// Tabla: individual_standings
// ============================================================
export interface IndividualStanding {
  id: string;
  tournament_id: string;
  team_id: string;
  player_id: string;
  matches_played: number;
  byes: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_scored: number;
  points_conceded: number;
  point_difference: number;
  ranking_position: number | null;
  updated_at: string;
}

// ============================================================
// Tabla: pairing_history
// ============================================================
export interface PairingHistory {
  id: string;
  tournament_id: string;
  round_id: string;
  player_id: string;
  partner_player_id: string;
  opponent_player_1_id: string;
  opponent_player_2_id: string;
  created_at: string;
}

// ============================================================
// Tipos enriquecidos (con joins)
// ============================================================

export interface TournamentPlayerWithDetails extends TournamentPlayer {
  player: Player;
  team: Team;
}

export interface MatchWithDetails extends Match {
  round: Round;
  team_a: Team;
  team_b: Team;
  winner_team: Team | null;
  pairs: MatchPairWithPlayers[];
}

export interface MatchPairWithPlayers extends MatchPair {
  players: Player[];
}

export interface RoundWithMatches extends Round {
  matches: MatchWithDetails[];
  byes: RoundByeWithPlayer[];
}

export interface RoundByeWithPlayer extends RoundBye {
  player: Player;
  team: Team;
}

export interface TeamStandingWithTeam extends TeamStanding {
  team: Team;
}

export interface IndividualStandingWithPlayer extends IndividualStanding {
  player: Player;
  team: Team;
}

export interface TournamentWithDetails extends Tournament {
  teams: Team[];
  tournament_players: TournamentPlayerWithDetails[];
  rounds: Round[];
  team_standings: TeamStandingWithTeam[];
}
