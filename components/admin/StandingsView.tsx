"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { recalculateStandings } from "@/lib/tournament/actions";
import { useRouter } from "next/navigation";
import { RefreshCw, Trophy, User, Loader2 } from "lucide-react";

interface Team {
  id: string;
  name: string;
  color: string | null;
}

interface TeamStanding {
  id: string;
  team_id: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points_scored: number;
  bonus_points: number;
  total_points: number;
}

interface IndividualStanding {
  player_id: string;
  team_id: string;
  matches_played: number;
  byes: number;
  matches_won: number;
  matches_lost: number;
  points_scored: number;
  point_difference: number;
  ranking_position: number | null;
  players: { display_name: string } | null;
}

export default function StandingsView({
  tournamentId,
  teams,
  teamStandings,
}: {
  tournamentId: string;
  teams: Team[];
  teamStandings: TeamStanding[];
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [individualStandings, setIndividualStandings] = useState<IndividualStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"teams" | "individual">("teams");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("individual_standings")
        .select("*, players(display_name)")
        .eq("tournament_id", tournamentId)
        .order("ranking_position", { ascending: true });

      setIndividualStandings((data as IndividualStanding[]) ?? []);
      setLoading(false);
    }
    load();
  }, [tournamentId]);

  async function handleRecalculate() {
    setIsPending(true);
    await recalculateStandings(tournamentId);
    router.refresh();
    setIsPending(false);
  }

  const sortedTeamStandings = [...teamStandings].sort(
    (a, b) => b.total_points - a.total_points
  );

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg ring-1 ring-gray-200 overflow-hidden">
          <button
            onClick={() => setActiveView("teams")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeView === "teams"
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Equipos
          </button>
          <button
            onClick={() => setActiveView("individual")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeView === "individual"
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Individual
          </button>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={isPending}
          className="btn-secondary text-xs py-2 px-3"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Recalcular
        </button>
      </div>

      {activeView === "teams" ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Equipo</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">PJ</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">G</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">E</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">P</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Pts</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Bonus</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 font-bold text-brand-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTeamStandings.map((standing, idx) => {
                const team = teamMap.get(standing.team_id);
                return (
                  <tr key={standing.id} className={idx === 0 ? "bg-brand-50" : ""}>
                    <td className="px-4 py-3 font-semibold text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: team?.color ?? "#6b7280" }}
                        />
                        <span className="font-medium text-gray-900">{team?.name}</span>
                        {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">{standing.matches_played}</td>
                    <td className="px-3 py-3 text-center text-green-600 font-medium">{standing.matches_won}</td>
                    <td className="px-3 py-3 text-center text-gray-500">{standing.matches_drawn}</td>
                    <td className="px-3 py-3 text-center text-red-500">{standing.matches_lost}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{standing.points_scored}</td>
                    <td className="px-3 py-3 text-center text-amber-600">{standing.bonus_points}</td>
                    <td className="px-3 py-3 text-center font-bold text-brand-700">{standing.total_points}</td>
                  </tr>
                );
              })}
              {sortedTeamStandings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Sin partidos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : (
            teams.map((team) => {
              const players = individualStandings
                .filter((s) => s.team_id === team.id)
                .sort((a, b) => (a.ranking_position ?? 99) - (b.ranking_position ?? 99));

              return (
                <div key={team.id} className="card overflow-hidden p-0">
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: team.color ?? "#6b7280" }}
                    />
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Jugador</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">PJ</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">G</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Pts</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Dif</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Desc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {players.map((p) => (
                        <tr key={p.player_id}>
                          <td className="px-4 py-2.5 text-gray-500 font-medium">
                            {p.ranking_position ?? "–"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-gray-900">{p.players?.display_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-600">{p.matches_played}</td>
                          <td className="px-3 py-2.5 text-center text-green-600 font-medium">{p.matches_won}</td>
                          <td className="px-3 py-2.5 text-center text-brand-700 font-semibold">{p.points_scored}</td>
                          <td className={`px-3 py-2.5 text-center font-medium ${
                            p.point_difference > 0 ? "text-green-600" :
                            p.point_difference < 0 ? "text-red-500" : "text-gray-500"
                          }`}>
                            {p.point_difference > 0 ? `+${p.point_difference}` : p.point_difference}
                          </td>
                          <td className="px-3 py-2.5 text-center text-amber-600">{p.byes}</td>
                        </tr>
                      ))}
                      {players.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-gray-400 text-sm">
                            Sin datos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
