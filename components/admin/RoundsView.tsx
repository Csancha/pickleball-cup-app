"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitMatchResult } from "@/lib/tournament/actions";
import { useRouter } from "next/navigation";
import {
  MapPin, Coffee, User, ChevronDown, ChevronUp,
  CheckCircle, Clock, Loader2, AlertCircle
} from "lucide-react";

interface RoundSummary {
  id: string;
  round_number: number;
  phase: string;
  status: string;
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

interface RoundDetail {
  matches: Match[];
  byes: { player_id: string; team_id: string; players: { display_name: string }; teams: { name: string } }[];
}

export default function RoundsView({
  tournamentId,
  rounds,
}: {
  tournamentId: string;
  rounds: RoundSummary[];
}) {
  const leagueRounds = rounds
    .filter((r) => r.phase === "league")
    .sort((a, b) => a.round_number - b.round_number);

  const [activeRound, setActiveRound] = useState(
    leagueRounds.find((r) => r.status === "active")?.id ??
    leagueRounds[0]?.id
  );

  if (leagueRounds.length === 0) {
    return (
      <div className="card py-12 text-center">
        <Clock className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">Las rondas no han sido generadas aún</p>
        <p className="text-sm text-gray-400 mt-1">
          Activa el torneo y usa el botón &quot;Generar rondas&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector de ronda */}
      <div className="flex overflow-x-auto gap-2 pb-1">
        {leagueRounds.map((round) => (
          <button
            key={round.id}
            onClick={() => setActiveRound(round.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeRound === round.id
                ? "bg-brand-600 text-white"
                : round.status === "finished"
                ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                : round.status === "active"
                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Ronda {round.round_number}
            {round.status === "active" && (
              <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Detalle de la ronda seleccionada */}
      {activeRound && (
        <RoundDetail
          roundId={activeRound}
          tournamentId={tournamentId}
          roundNumber={
            leagueRounds.find((r) => r.id === activeRound)?.round_number ?? 0
          }
        />
      )}
    </div>
  );
}

function RoundDetail({
  roundId,
  tournamentId,
  roundNumber,
}: {
  roundId: string;
  tournamentId: string;
  roundNumber: number;
}) {
  const router = useRouter();
  const [data, setData] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teamNames, setTeamNames] = useState<Map<string, { name: string; color: string }>>(new Map());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      const [matchesRes, byesRes, teamsRes] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id, court_number, team_a_id, team_b_id,
            team_a_score, team_b_score, winner_team_id, is_draw, status,
            match_pairs(
              id, team_id,
              match_pair_players(
                player_id,
                players(display_name)
              )
            )
          `)
          .eq("round_id", roundId)
          .order("court_number"),
        supabase
          .from("round_byes")
          .select("player_id, team_id, players(display_name), teams(name)")
          .eq("round_id", roundId),
        supabase
          .from("teams")
          .select("id, name, color")
          .eq("tournament_id", tournamentId),
      ]);

      if (teamsRes.data) {
        const map = new Map<string, { name: string; color: string }>();
        for (const t of teamsRes.data) {
          map.set(t.id, { name: t.name, color: t.color ?? "#6b7280" });
        }
        setTeamNames(map);
      }

      setData({
        matches: (matchesRes.data as unknown as Match[]) ?? [],
        byes: (byesRes.data as unknown as RoundDetail["byes"]) ?? [],
      });
      setLoading(false);
    }
    load();
  }, [roundId, tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!data) return null;

  const allFinished = data.matches.length > 0 && data.matches.every((m) => m.status === "finished");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Ronda {roundNumber}</h3>
        {allFinished && (
          <span className="badge badge-green flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Terminada
          </span>
        )}
      </div>

      {/* Partidos */}
      {data.matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          teamNames={teamNames}
          onResultSubmit={async (scoreA, scoreB) => {
            const res = await submitMatchResult({
              match_id: match.id,
              team_a_score: scoreA,
              team_b_score: scoreB,
            });
            if (!res.success) setError(res.error);
            else {
              setData((prev) =>
                prev
                  ? {
                      ...prev,
                      matches: prev.matches.map((m) =>
                        m.id === match.id
                          ? { ...m, team_a_score: scoreA, team_b_score: scoreB, status: "finished" }
                          : m
                      ),
                    }
                  : prev
              );
              router.refresh();
            }
          }}
        />
      ))}

      {/* Byes */}
      {data.byes.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coffee className="h-4 w-4 text-amber-500" />
            <h4 className="font-medium text-gray-700">Descansan esta ronda</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.byes.map((bye) => (
              <div
                key={bye.player_id}
                className="player-chip"
              >
                <User className="h-3.5 w-3.5 text-gray-500" />
                {bye.players?.display_name ?? bye.player_id}
                <span className="text-gray-400 text-xs">
                  ({bye.teams?.name ?? "?"})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  teamNames,
  onResultSubmit,
}: {
  match: Match;
  teamNames: Map<string, { name: string; color: string }>;
  onResultSubmit: (scoreA: number, scoreB: number) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scoreA, setScoreA] = useState(match.team_a_score);
  const [scoreB, setScoreB] = useState(match.team_b_score);
  const [submitting, setSubmitting] = useState(false);

  const teamA = teamNames.get(match.team_a_id);
  const teamB = teamNames.get(match.team_b_id);

  const pairA = match.match_pairs?.find((p) => p.team_id === match.team_a_id);
  const pairB = match.match_pairs?.find((p) => p.team_id === match.team_b_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onResultSubmit(scoreA, scoreB);
    setSubmitting(false);
    setExpanded(false);
  }

  return (
    <div className="court-card">
      {/* Header de la pista */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white text-sm font-bold">
            {match.court_number}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pista {match.court_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {match.status === "finished" ? (
            <span className="badge badge-green flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Terminado
            </span>
          ) : (
            <span className="badge badge-blue flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pendiente
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Marcador y equipos */}
      <div className="flex items-center justify-between gap-2">
        {/* Equipo A */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: teamA?.color ?? "#6b7280" }}
            />
            <span className="text-xs font-medium text-gray-600 truncate">{teamA?.name}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {pairA?.match_pair_players?.map((mp) => (
              <span key={mp.player_id} className="text-xs bg-white rounded px-1.5 py-0.5 text-gray-700">
                {mp.players?.display_name ?? "?"}
              </span>
            ))}
          </div>
        </div>

        {/* Marcador */}
        <div className="text-center shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-lg">
            <span className={match.winner_team_id === match.team_a_id ? "text-brand-700" : "text-gray-700"}>
              {match.team_a_score}
            </span>
            <span className="text-gray-300">–</span>
            <span className={match.winner_team_id === match.team_b_id ? "text-brand-700" : "text-gray-700"}>
              {match.team_b_score}
            </span>
          </div>
          {match.is_draw && <span className="text-xs text-gray-400">Empate</span>}
        </div>

        {/* Equipo B */}
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            <span className="text-xs font-medium text-gray-600 truncate">{teamB?.name}</span>
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: teamB?.color ?? "#6b7280" }}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {pairB?.match_pair_players?.map((mp) => (
              <span key={mp.player_id} className="text-xs bg-white rounded px-1.5 py-0.5 text-gray-700">
                {mp.players?.display_name ?? "?"}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Formulario de resultado (expandible) */}
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-brand-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Registrar resultado</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{teamA?.name}</label>
              <input
                type="number"
                min={0}
                max={99}
                value={scoreA}
                onChange={(e) => setScoreA(Number(e.target.value))}
                className="input text-center text-lg font-bold"
              />
            </div>
            <span className="text-gray-400 font-bold pt-5">vs</span>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">{teamB?.name}</label>
              <input
                type="number"
                min={0}
                max={99}
                value={scoreB}
                onChange={(e) => setScoreB(Number(e.target.value))}
                className="input text-center text-lg font-bold"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full mt-3"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              "Guardar resultado"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
