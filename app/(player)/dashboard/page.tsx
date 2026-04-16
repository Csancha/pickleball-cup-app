import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, Users, User, Calendar, BarChart3, Coffee } from "lucide-react";

export const metadata: Metadata = { title: "Mi torneo" };

export default async function PlayerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Buscar el perfil del jugador
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", user.id)
    .single();

  // Buscar el player vinculado a este profile
  const { data: player } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("profile_id", user.id)
    .single();

  // Buscar si está en algún torneo activo
  let tournamentPlayer = null;
  let tournament = null;
  let team = null;
  let individualStanding = null;

  if (player) {
    const { data: tp } = await supabase
      .from("tournament_players")
      .select(`
        id, team_id, total_byes, total_matches_played,
        tournaments(id, name, status, current_phase, total_league_rounds, match_duration_minutes, total_courts),
        teams(id, name, color)
      `)
      .eq("player_id", player.id)
      .in("tournaments.status", ["active", "finals_active", "league_finished"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tp) {
      tournamentPlayer = tp;
      tournament = tp.tournaments as unknown as Record<string, unknown>;
      team = tp.teams as unknown as Record<string, unknown>;

      const { data: standing } = await supabase
        .from("individual_standings")
        .select("matches_played, matches_won, points_scored, ranking_position, byes")
        .eq("tournament_id", (tournament as { id: string }).id)
        .eq("player_id", player.id)
        .single();

      individualStanding = standing;
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Bienvenida */}
      <div className="card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {(profile?.full_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Hola, {profile?.full_name?.split(" ")[0] ?? "jugador"}
            </h1>
            <p className="text-sm text-gray-500">
              {player ? player.display_name : "Sin ficha de jugador"}
            </p>
          </div>
        </div>
      </div>

      {/* Sin torneo */}
      {!tournament && (
        <div className="card py-12 text-center">
          <Trophy className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 font-semibold text-gray-700">Sin torneo activo</h2>
          <p className="mt-1 text-sm text-gray-400">
            No estás inscrito en ningún torneo activo en este momento.
          </p>
          {!player && (
            <p className="mt-3 text-sm text-gray-400">
              Contacta con el administrador para que te añada al torneo.
            </p>
          )}
        </div>
      )}

      {/* Torneo activo */}
      {tournament && (
        <>
          {/* Info del torneo */}
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Torneo actual</p>
                <h2 className="font-bold text-gray-900">{String(tournament.name)}</h2>
              </div>
              <span className="badge badge-blue">
                {(tournament as { status: string }).status === "finals_active" ? "Finales" : "En curso"}
              </span>
            </div>
          </div>

          {/* Equipo */}
          {team && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl shrink-0"
                  style={{ backgroundColor: String((team as { color?: unknown }).color ?? "#6b7280") }}
                />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Mi equipo</p>
                  <p className="font-bold text-gray-900">{String((team as { name: string }).name)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mis stats */}
          {individualStanding && (
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <p className="text-xl font-bold text-brand-700">
                  {individualStanding.ranking_position ?? "–"}
                </p>
                <p className="text-xs text-gray-500">Ranking</p>
              </div>
              <div className="card text-center">
                <p className="text-xl font-bold text-green-600">
                  {individualStanding.matches_won}
                </p>
                <p className="text-xs text-gray-500">Victorias</p>
              </div>
              <div className="card text-center">
                <p className="text-xl font-bold text-gray-700">
                  {individualStanding.points_scored}
                </p>
                <p className="text-xs text-gray-500">Puntos</p>
              </div>
            </div>
          )}

          {/* Accesos rápidos */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Accesos rápidos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickLink
                href={`/tournament/${(tournament as { id: string }).id}`}
                icon={<Calendar className="h-5 w-5 text-brand-600" />}
                label="Mis partidos"
              />
              <QuickLink
                href={`/tournament/${(tournament as { id: string }).id}?tab=standings`}
                icon={<BarChart3 className="h-5 w-5 text-brand-600" />}
                label="Clasificación"
              />
              <QuickLink
                href={`/tournament/${(tournament as { id: string }).id}?tab=team`}
                icon={<Users className="h-5 w-5 text-brand-600" />}
                label="Mi equipo"
              />
              {tournamentPlayer && tournamentPlayer.total_byes > 0 && (
                <QuickLink
                  href={`/tournament/${(tournament as { id: string }).id}?tab=byes`}
                  icon={<Coffee className="h-5 w-5 text-amber-500" />}
                  label="Mis descansos"
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link href={href} className="card-hover flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 shrink-0">
        {icon}
      </div>
      <span className="font-medium text-gray-800 text-sm">{label}</span>
    </Link>
  );
}
