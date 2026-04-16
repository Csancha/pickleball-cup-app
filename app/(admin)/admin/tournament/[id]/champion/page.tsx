import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Trophy, ChevronRight, Award, Users } from "lucide-react";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Campeón" };

export default async function ChampionPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .eq("id", id)
    .single();

  if (!tournament || tournament.status !== "finished") notFound();

  // Determinar el campeón: el equipo con más victorias en la fase final
  const { data: finalMatches } = await supabase
    .from("matches")
    .select("winner_team_id, team_a_id, team_b_id, team_a_score, team_b_score")
    .eq("tournament_id", id)
    .eq("phase", "finals")
    .eq("status", "finished");

  const winsByTeam = new Map<string, number>();
  for (const m of finalMatches ?? []) {
    if (m.winner_team_id) {
      winsByTeam.set(m.winner_team_id, (winsByTeam.get(m.winner_team_id) ?? 0) + 1);
    }
  }

  let championTeamId: string | null = null;
  let maxWins = -1;
  winsByTeam.forEach((wins, teamId) => {
    if (wins > maxWins) {
      maxWins = wins;
      championTeamId = teamId;
    }
  });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, color")
    .eq("tournament_id", id);

  const { data: championPlayers } = championTeamId
    ? await supabase
        .from("individual_standings")
        .select("player_id, ranking_position, players(display_name)")
        .eq("tournament_id", id)
        .eq("team_id", championTeamId)
        .order("ranking_position")
    : { data: [] };

  const champion = teams?.find((t) => t.id === championTeamId);
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:text-gray-600">Torneos</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/admin/tournament/${id}`} className="hover:text-gray-600 truncate">
          {tournament.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-600">Campeón</span>
      </div>

      {/* Hero */}
      <div className="text-center py-8">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
          <Trophy className="h-12 w-12 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Campeón!
        </h1>
        <p className="text-gray-500">{tournament.name}</p>
      </div>

      {/* Equipo campeón */}
      {champion && (
        <div className="card p-6 text-center">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
            style={{ backgroundColor: champion.color ?? "#6b7280" }}
          >
            <Award className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{champion.name}</h2>
          <p className="text-gray-500 mt-1">
            {maxWins} {maxWins === 1 ? "victoria" : "victorias"} en la fase final
          </p>
        </div>
      )}

      {/* Jugadores del equipo campeón */}
      {championPlayers && championPlayers.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Jugadores del equipo campeón</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(championPlayers as { player_id: string; ranking_position: number | null; players: { display_name: string } | null }[]).map(
              (p, idx) => (
                <div key={p.player_id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-100 text-amber-700" :
                    idx === 1 ? "bg-gray-100 text-gray-600" :
                    "bg-gray-50 text-gray-500"
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {p.players?.display_name ?? "?"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Resultados de la final */}
      {finalMatches && finalMatches.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Resultados de la final</h3>
          <div className="space-y-2">
            {(finalMatches as { winner_team_id: string | null; team_a_id: string; team_b_id: string; team_a_score: number; team_b_score: number }[]).map(
              (m, idx) => {
                const tA = teamMap.get(m.team_a_id);
                const tB = teamMap.get(m.team_b_id);
                return (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tA?.color }} />
                      <span className={`text-sm ${m.winner_team_id === m.team_a_id ? "font-bold text-brand-700" : "text-gray-600"}`}>
                        {tA?.name}
                      </span>
                    </div>
                    <div className="font-bold text-gray-900 px-3">
                      {m.team_a_score} – {m.team_b_score}
                    </div>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className={`text-sm ${m.winner_team_id === m.team_b_id ? "font-bold text-brand-700" : "text-gray-600"}`}>
                        {tB?.name}
                      </span>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tB?.color }} />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}

      <Link href={`/admin/tournament/${id}`} className="btn-secondary w-full justify-center">
        Volver al torneo
      </Link>
    </div>
  );
}
