"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitMatchResult } from "@/lib/tournament/actions";
import { useRouter } from "next/navigation";
import { Trophy, Loader2, CheckCircle, Award } from "lucide-react";

interface FinalMatch {
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

export default function FinalsView({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [matches, setMatches] = useState<FinalMatch[]>([]);
  const [teams, setTeams] = useState<Map<string, { name: string; color: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Map<string, { a: number; b: number }>>(new Map());
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [matchesRes, teamsRes] = await Promise.all([
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
          .eq("tournament_id", tournamentId)
          .eq("phase", "finals")
          .order("court_number"),
        supabase.from("teams").select("id, name, color").eq("tournament_id", tournamentId),
      ]);

      if (teamsRes.data) {
        const map = new Map<string, { name: string; color: string }>();
        for (const t of teamsRes.data) map.set(t.id, { name: t.name, color: t.color ?? "#6b7280" });
        setTeams(map);
      }

      const ms = (matchesRes.data as unknown as FinalMatch[]) ?? [];
      setMatches(ms);

      const initScores = new Map<string, { a: number; b: number }>();
      for (const m of ms) initScores.set(m.id, { a: m.team_a_score, b: m.team_b_score });
      setScores(initScores);

      setLoading(false);
    }
    load();
  }, [tournamentId]);

  async function handleSubmit(matchId: string) {
    const s = scores.get(matchId);
    if (!s) return;
    setSubmitting(matchId);
    await submitMatchResult({ match_id: matchId, team_a_score: s.a, team_b_score: s.b });
    setSubmitting(null);
    router.refresh();
    // Recargar
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, team_a_score: s.a, team_b_score: s.b, status: "finished" }
          : m
      )
    );
  }

  // Calcular marcador de la final
  const winsByTeam = new Map<string, number>();
  for (const m of matches) {
    if (m.status === "finished" && m.winner_team_id) {
      winsByTeam.set(m.winner_team_id, (winsByTeam.get(m.winner_team_id) ?? 0) + 1);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="card py-12 text-center">
        <Trophy className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-gray-500">No hay partidos de fase final</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Marcador final */}
      <div className="card p-5 bg-gradient-to-br from-brand-50 to-amber-50">
        <div className="text-center mb-4">
          <Trophy className="mx-auto h-8 w-8 text-amber-500 mb-2" />
          <h3 className="font-bold text-gray-900 text-lg">Fase Final</h3>
        </div>
        <div className="flex items-center justify-center gap-8">
          {Array.from(teams.entries()).map(([teamId, team]) => (
            <div key={teamId} className="text-center">
              <div
                className="mx-auto mb-2 h-4 w-4 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <p className="text-sm font-medium text-gray-700">{team.name}</p>
              <p className="text-3xl font-bold text-brand-700">
                {winsByTeam.get(teamId) ?? 0}
              </p>
              <p className="text-xs text-gray-400">victorias</p>
            </div>
          ))}
        </div>
      </div>

      {/* Partidos de la final */}
      {matches.map((match) => {
        const teamA = teams.get(match.team_a_id);
        const teamB = teams.get(match.team_b_id);
        const pairA = match.match_pairs?.find((p) => p.team_id === match.team_a_id);
        const pairB = match.match_pairs?.find((p) => p.team_id === match.team_b_id);
        const s = scores.get(match.id) ?? { a: 0, b: 0 };

        return (
          <div key={match.id} className="card p-4 border-2 border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-gray-900">Pista {match.court_number}</span>
              </div>
              {match.status === "finished" ? (
                <span className="badge badge-green flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Terminado
                </span>
              ) : (
                <span className="badge badge-yellow">Pendiente</span>
              )}
            </div>

            {/* Parejas */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { team: teamA, pair: pairA },
                { team: teamB, pair: pairB },
              ].map(({ team, pair }, idx) => (
                <div key={idx} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: team?.color ?? "#6b7280" }}
                    />
                    <span className="text-xs font-medium text-gray-600">{team?.name}</span>
                  </div>
                  {pair?.match_pair_players?.map((mp) => (
                    <p key={mp.player_id} className="text-sm text-gray-800">
                      {mp.players?.display_name ?? "?"}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Resultado */}
            {match.status !== "finished" ? (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={s.a}
                  onChange={(e) =>
                    setScores((prev) => new Map(prev).set(match.id, { a: Number(e.target.value), b: s.b }))
                  }
                  className="input text-center font-bold text-lg flex-1"
                />
                <span className="text-gray-400 font-bold">vs</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={s.b}
                  onChange={(e) =>
                    setScores((prev) => new Map(prev).set(match.id, { a: s.a, b: Number(e.target.value) }))
                  }
                  className="input text-center font-bold text-lg flex-1"
                />
                <button
                  onClick={() => handleSubmit(match.id)}
                  disabled={submitting === match.id}
                  className="btn-primary"
                >
                  {submitting === match.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : "Guardar"}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 pt-2">
                <span className={`text-2xl font-bold ${match.winner_team_id === match.team_a_id ? "text-brand-700" : "text-gray-500"}`}>
                  {match.team_a_score}
                </span>
                <span className="text-gray-400">–</span>
                <span className={`text-2xl font-bold ${match.winner_team_id === match.team_b_id ? "text-brand-700" : "text-gray-500"}`}>
                  {match.team_b_score}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
