"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight, MapPin, Coffee, User, Trophy,
  CheckCircle, Clock, Award, Users
} from "lucide-react";

type Tab = "matches" | "standings" | "team" | "finals";

interface Props {
  tournament: Record<string, unknown>;
  player: { id: string; display_name: string } | null;
  rounds: Record<string, unknown>[];
  teams: Record<string, unknown>[];
  individualStandings: Record<string, unknown>[];
  teamStandings: Record<string, unknown>[];
  initialTab: string;
}

export default function PlayerTournamentView({
  tournament,
  player,
  rounds,
  teams,
  individualStandings,
  teamStandings,
  initialTab,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(
    (initialTab as Tab) ?? "matches"
  );

  const t = tournament as {
    id: string; name: string; status: string;
    total_league_rounds: number; match_duration_minutes: number;
  };

  const hasFinals = t.status === "finals_active" || t.status === "finished";
  const tabs: { id: Tab; label: string }[] = [
    { id: "matches", label: "Partidos" },
    { id: "standings", label: "Clasificación" },
    { id: "team", label: "Equipo" },
    ...(hasFinals ? [{ id: "finals" as Tab, label: "Final" }] : []),
  ];

  const teamMap = new Map(
    (teams as { id: string; name: string; color: string }[]).map((t) => [
      t.id,
      t,
    ])
  );

  // Mis datos
  const myPlayerId = player?.id;
  const myTp = myPlayerId
    ? null // Se obtiene del round
    : null;

  // Encontrar el equipo del jugador actual
  let myTeamId: string | null = null;
  for (const round of rounds as Record<string, unknown>[]) {
    const matches = (round.matches ?? []) as Record<string, unknown>[];
    for (const match of matches) {
      const pairs = (match.match_pairs ?? []) as Record<string, unknown>[];
      for (const pair of pairs) {
        const pairPlayers = (pair.match_pair_players ?? []) as Record<string, unknown>[];
        if (pairPlayers.some((p) => p.player_id === myPlayerId)) {
          myTeamId = pair.team_id as string;
          break;
        }
      }
      if (myTeamId) break;
    }
    if (myTeamId) break;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-600">Inicio</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-600 truncate">{t.name}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{t.name}</h1>
        {player && myTeamId && (
          <div className="flex items-center gap-2 mt-1">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: teamMap.get(myTeamId)?.color ?? "#6b7280" }}
            />
            <p className="text-sm text-gray-600">
              {player.display_name} · {teamMap.get(myTeamId)?.name ?? "?"}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido */}
      {activeTab === "matches" && (
        <MatchesTab
          rounds={rounds as unknown as Round[]}
          teamMap={teamMap}
          myPlayerId={myPlayerId}
        />
      )}
      {activeTab === "standings" && (
        <StandingsTab
          teams={teams as unknown as Team[]}
          teamStandings={teamStandings as unknown as TeamStanding[]}
          individualStandings={individualStandings as unknown as IndividualStanding[]}
          myPlayerId={myPlayerId}
        />
      )}
      {activeTab === "team" && (
        <TeamTab
          rounds={rounds as unknown as Round[]}
          teams={teams as unknown as Team[]}
          individualStandings={individualStandings as unknown as IndividualStanding[]}
          myPlayerId={myPlayerId}
          myTeamId={myTeamId}
        />
      )}
      {activeTab === "finals" && hasFinals && (
        <FinalsTab
          rounds={rounds as unknown as Round[]}
          teamMap={teamMap}
        />
      )}
    </div>
  );
}

// ============================================================
// TIPOS LOCALES
// ============================================================

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Round {
  id: string;
  round_number: number;
  phase: string;
  status: string;
  matches: Match[];
  round_byes: { player_id: string; players: { display_name: string } }[];
}

interface Match {
  id: string;
  court_number: number;
  team_a_id: string;
  team_b_id: string;
  team_a_score: number;
  team_b_score: number;
  winner_team_id: string | null;
  is_draw: boolean;
  status: string;
  match_pairs: {
    id: string;
    team_id: string;
    match_pair_players: { player_id: string; players: { display_name: string } }[];
  }[];
}

interface TeamStanding {
  team_id: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  points_scored: number;
  bonus_points: number;
  total_points: number;
}

interface IndividualStanding {
  player_id: string;
  team_id: string;
  matches_played: number;
  matches_won: number;
  points_scored: number;
  point_difference: number;
  ranking_position: number | null;
  byes: number;
  players: { display_name: string } | null;
}

// ============================================================
// PESTAÑA PARTIDOS
// ============================================================

function MatchesTab({
  rounds,
  teamMap,
  myPlayerId,
}: {
  rounds: Round[];
  teamMap: Map<string, Team>;
  myPlayerId: string | undefined;
}) {
  const leagueRounds = rounds
    .filter((r) => r.phase === "league")
    .sort((a, b) => a.round_number - b.round_number);

  if (leagueRounds.length === 0) {
    return (
      <div className="card py-12 text-center">
        <Clock className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">Las rondas aún no están disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leagueRounds.map((round) => {
        // ¿Descanso en esta ronda?
        const myBye = round.round_byes?.find((b) => b.player_id === myPlayerId);

        // Mis partidos
        const myMatches = round.matches?.filter((m) =>
          m.match_pairs?.some((p) =>
            p.match_pair_players?.some((pp) => pp.player_id === myPlayerId)
          )
        );

        return (
          <div key={round.id}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">Ronda {round.round_number}</h3>
              {round.status === "active" && (
                <span className="badge badge-blue flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  En juego
                </span>
              )}
              {round.status === "finished" && (
                <span className="badge badge-green flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Terminada
                </span>
              )}
            </div>

            {myBye ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
                <Coffee className="h-5 w-5 text-amber-500" />
                <p className="text-sm text-amber-700 font-medium">
                  Descansas esta ronda
                </p>
              </div>
            ) : myMatches && myMatches.length > 0 ? (
              <div className="space-y-2">
                {myMatches.map((match) => (
                  <PlayerMatchCard
                    key={match.id}
                    match={match}
                    teamMap={teamMap}
                    myPlayerId={myPlayerId}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400 py-2">Sin partidos asignados</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayerMatchCard({
  match,
  teamMap,
  myPlayerId,
}: {
  match: Match;
  teamMap: Map<string, Team>;
  myPlayerId: string | undefined;
}) {
  // Determinar en qué pareja estoy
  const myPair = match.match_pairs?.find((p) =>
    p.match_pair_players?.some((pp) => pp.player_id === myPlayerId)
  );
  const opponentPair = match.match_pairs?.find((p) => p.id !== myPair?.id);

  const myTeam = myPair ? teamMap.get(myPair.team_id) : undefined;
  const opponentTeam = opponentPair ? teamMap.get(opponentPair.team_id) : undefined;

  const myScore = myPair?.team_id === match.team_a_id ? match.team_a_score : match.team_b_score;
  const theirScore = myPair?.team_id === match.team_a_id ? match.team_b_score : match.team_a_score;

  const isWinner = match.status === "finished" && match.winner_team_id === myPair?.team_id;
  const isLoser = match.status === "finished" && !match.is_draw && match.winner_team_id !== myPair?.team_id;
  const isDraw = match.is_draw;

  return (
    <div className={`court-card ${
      isWinner ? "border-green-300 bg-green-50" :
      isLoser ? "border-red-200 bg-red-50/50" :
      ""
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
            {match.court_number}
          </div>
          <span className="text-xs text-gray-500">Pista {match.court_number}</span>
        </div>
        {match.status === "finished" ? (
          <span className={`badge text-xs ${isWinner ? "badge-green" : isLoser ? "badge-red" : "badge-gray"}`}>
            {isWinner ? "Victoria" : isLoser ? "Derrota" : isDraw ? "Empate" : "—"}
          </span>
        ) : (
          <span className="badge badge-blue text-xs">Pendiente</span>
        )}
      </div>

      {/* Mi pareja */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-gray-400 mb-1">Mi pareja</p>
          {myPair?.match_pair_players?.map((pp) => (
            <p key={pp.player_id} className={`${pp.player_id === myPlayerId ? "font-semibold text-gray-900" : "text-gray-600"}`}>
              {pp.players?.display_name ?? "?"}
            </p>
          ))}
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Rival</p>
          {opponentPair?.match_pair_players?.map((pp) => (
            <p key={pp.player_id} className="text-gray-600">
              {pp.players?.display_name ?? "?"}
            </p>
          ))}
        </div>
      </div>

      {/* Marcador */}
      {match.status === "finished" && (
        <div className="mt-3 pt-3 border-t border-brand-200 flex items-center justify-center gap-3">
          <span className={`text-2xl font-bold ${isWinner ? "text-green-600" : "text-gray-600"}`}>
            {myScore}
          </span>
          <span className="text-gray-400">–</span>
          <span className={`text-2xl font-bold ${isLoser ? "text-red-500" : "text-gray-600"}`}>
            {theirScore}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PESTAÑA CLASIFICACIÓN
// ============================================================

function StandingsTab({
  teams,
  teamStandings,
  individualStandings,
  myPlayerId,
}: {
  teams: Team[];
  teamStandings: TeamStanding[];
  individualStandings: IndividualStanding[];
  myPlayerId: string | undefined;
}) {
  const [view, setView] = useState<"teams" | "individual">("teams");
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const sortedTeams = [...teamStandings].sort(
    (a, b) => b.total_points - a.total_points
  );

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg ring-1 ring-gray-200 overflow-hidden">
        <button
          onClick={() => setView("teams")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === "teams" ? "bg-brand-600 text-white" : "bg-white text-gray-600"
          }`}
        >
          Equipos
        </button>
        <button
          onClick={() => setView("individual")}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            view === "individual" ? "bg-brand-600 text-white" : "bg-white text-gray-600"
          }`}
        >
          Individual
        </button>
      </div>

      {view === "teams" ? (
        <div className="space-y-2">
          {sortedTeams.map((ts, idx) => {
            const team = teamMap.get(ts.team_id);
            return (
              <div key={ts.team_id} className={`card p-4 ${idx === 0 ? "ring-2 ring-brand-300" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-gray-400 text-sm">{idx + 1}</span>
                  <div
                    className="h-8 w-8 rounded-lg shrink-0"
                    style={{ backgroundColor: team?.color ?? "#6b7280" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                      {team?.name}
                      {idx === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ts.matches_won}V · {ts.matches_played - ts.matches_won}P · {ts.points_scored} pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-700">{ts.total_points}</p>
                    <p className="text-xs text-gray-400">total</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const players = individualStandings
              .filter((s) => s.team_id === team.id)
              .sort((a, b) => (a.ranking_position ?? 99) - (b.ranking_position ?? 99));

            return (
              <div key={team.id} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100" style={{ borderLeftColor: team.color, borderLeftWidth: 4 }}>
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {players.map((p) => (
                    <div
                      key={p.player_id}
                      className={`flex items-center gap-3 px-4 py-3 ${p.player_id === myPlayerId ? "bg-brand-50" : ""}`}
                    >
                      <span className="w-5 text-center text-sm font-bold text-gray-400">
                        {p.ranking_position ?? "–"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${p.player_id === myPlayerId ? "text-brand-700" : "text-gray-900"}`}>
                          {p.players?.display_name ?? "?"}
                          {p.player_id === myPlayerId && (
                            <span className="ml-1 text-xs text-brand-400">(yo)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.matches_won}V · {p.byes} desc
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{p.points_scored}</p>
                        <p className={`text-xs ${p.point_difference > 0 ? "text-green-500" : p.point_difference < 0 ? "text-red-400" : "text-gray-400"}`}>
                          {p.point_difference > 0 ? `+${p.point_difference}` : p.point_difference}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// PESTAÑA EQUIPO
// ============================================================

function TeamTab({
  rounds,
  teams,
  individualStandings,
  myPlayerId,
  myTeamId,
}: {
  rounds: Round[];
  teams: Team[];
  individualStandings: IndividualStanding[];
  myPlayerId: string | undefined;
  myTeamId: string | null;
}) {
  if (!myTeamId) {
    return (
      <div className="card py-12 text-center">
        <Users className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">No estás asignado a ningún equipo</p>
      </div>
    );
  }

  const myTeam = teams.find((t) => t.id === myTeamId);
  const teamPlayers = individualStandings
    .filter((s) => s.team_id === myTeamId)
    .sort((a, b) => (a.ranking_position ?? 99) - (b.ranking_position ?? 99));

  return (
    <div className="space-y-4">
      {/* Equipo header */}
      {myTeam && (
        <div className="card p-4 flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl shrink-0"
            style={{ backgroundColor: myTeam.color }}
          />
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{myTeam.name}</h3>
            <p className="text-sm text-gray-500">{teamPlayers.length} jugadores</p>
          </div>
        </div>
      )}

      {/* Ranking interno del equipo */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Ranking del equipo</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {teamPlayers.map((p) => (
            <div
              key={p.player_id}
              className={`flex items-center gap-3 px-4 py-3 ${p.player_id === myPlayerId ? "bg-brand-50" : ""}`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                p.ranking_position === 1 ? "bg-amber-100 text-amber-700" :
                p.ranking_position === 2 ? "bg-gray-100 text-gray-600" :
                "bg-gray-50 text-gray-500"
              }`}>
                {p.ranking_position ?? "–"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${p.player_id === myPlayerId ? "text-brand-700" : "text-gray-900"}`}>
                  {p.players?.display_name ?? "?"}
                  {p.player_id === myPlayerId && <span className="ml-1 text-xs text-brand-400">(yo)</span>}
                </p>
                <p className="text-xs text-gray-400">
                  {p.matches_won}V · {p.matches_played}PJ · {p.byes} desc
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{p.points_scored}</p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PESTAÑA FINALES
// ============================================================

function FinalsTab({
  rounds,
  teamMap,
}: {
  rounds: Round[];
  teamMap: Map<string, Team>;
}) {
  const finalRounds = rounds
    .filter((r) => r.phase === "finals")
    .sort((a, b) => a.round_number - b.round_number);

  if (finalRounds.length === 0) {
    return (
      <div className="card py-12 text-center">
        <Award className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">La fase final aún no ha comenzado</p>
      </div>
    );
  }

  // Calcular victorias por equipo
  const teamWins = new Map<string, number>();
  for (const round of finalRounds) {
    for (const match of round.matches ?? []) {
      if (match.status === "finished" && match.winner_team_id) {
        teamWins.set(match.winner_team_id, (teamWins.get(match.winner_team_id) ?? 0) + 1);
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Marcador global */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-amber-50 text-center">
        <Award className="mx-auto h-8 w-8 text-amber-500 mb-3" />
        <h3 className="font-bold text-gray-900 mb-4">Fase Final</h3>
        <div className="flex justify-center items-center gap-8">
          {Array.from(teamMap.entries()).map(([teamId, team]) => (
            <div key={teamId}>
              <div
                className="mx-auto mb-2 h-4 w-4 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <p className="text-sm font-medium text-gray-700">{team.name}</p>
              <p className="text-3xl font-bold text-brand-700">
                {teamWins.get(teamId) ?? 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Partidos de la final */}
      {finalRounds.map((round) =>
        round.matches?.map((match) => {
          const teamA = teamMap.get(match.team_a_id);
          const teamB = teamMap.get(match.team_b_id);
          const pairA = match.match_pairs?.find((p) => p.team_id === match.team_a_id);
          const pairB = match.match_pairs?.find((p) => p.team_id === match.team_b_id);

          return (
            <div key={match.id} className="card p-4 border-2 border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-gray-900">Pista {match.court_number}</span>
                {match.status === "finished" && (
                  <span className="badge badge-green ml-auto flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Terminado
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[{ team: teamA, pair: pairA }, { team: teamB, pair: pairB }].map(
                  ({ team, pair }, idx) => (
                    <div key={idx} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: team?.color }} />
                        <span className="text-xs text-gray-500">{team?.name}</span>
                      </div>
                      {pair?.match_pair_players?.map((pp) => (
                        <p key={pp.player_id} className="text-sm text-gray-800">
                          {pp.players?.display_name ?? "?"}
                        </p>
                      ))}
                    </div>
                  )
                )}
              </div>

              {match.status === "finished" && (
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
                  <span className={`text-2xl font-bold ${match.winner_team_id === match.team_a_id ? "text-green-600" : "text-gray-500"}`}>
                    {match.team_a_score}
                  </span>
                  <span className="text-gray-400">–</span>
                  <span className={`text-2xl font-bold ${match.winner_team_id === match.team_b_id ? "text-green-600" : "text-gray-500"}`}>
                    {match.team_b_score}
                  </span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
