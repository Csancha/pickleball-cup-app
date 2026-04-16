import { createAdminClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { Trophy, Calendar, BarChart3, Users } from "lucide-react";

export const metadata: Metadata = { title: "Mi torneo" };

export default async function PlayerDashboardPage() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get("player_id")?.value;
  if (!playerId) redirect("/join");

  const supabase = await createAdminClient();

  // Player info
  const { data: player } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("id", playerId)
    .single();

  if (!player) redirect("/join");

  // Torneo activo del jugador
  const { data: tp } = await supabase
    .from("tournament_players")
    .select(`
      id, team_id, total_byes,
      tournaments(id, name, status, current_phase),
      teams(id, name, color)
    `)
    .eq("player_id", playerId)
    .not("tournaments.status", "eq", "finished")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tournament = tp?.tournaments as unknown as { id: string; name: string; status: string; current_phase: string } | null;
  const team = tp?.teams as unknown as { id: string; name: string; color: string } | null;

  // Clasificación individual
  let standing = null;
  if (tournament) {
    const { data } = await supabase
      .from("individual_standings")
      .select("matches_played, matches_won, points_scored, ranking_position, byes")
      .eq("tournament_id", tournament.id)
      .eq("player_id", playerId)
      .maybeSingle();
    standing = data;
  }

  const phase = tournament?.status === "finals_active" ? "FINALES" :
    tournament?.status === "league_finished" ? "LIGA TERMINADA" : "EN JUEGO";

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Welcome */}
      <div className="rounded-lg py-6 text-center" style={{ background: "linear-gradient(135deg, #1e1945 0%, #16132e 100%)", border: "1px solid rgba(255,0,144,0.3)" }}>
        <p className="font-display text-[10px] tracking-[0.4em] text-muted mb-1">BIENVENIDO</p>
        <h1 className="font-display text-4xl text-neon-pink" style={{ letterSpacing: "0.05em" }}>
          {player.display_name.toUpperCase()}
        </h1>
        {team && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: team.color, boxShadow: `0 0 6px ${team.color}` }}
            />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: team.color }}>
              {team.name}
            </span>
          </div>
        )}
      </div>

      {/* Sin torneo */}
      {!tournament && (
        <div className="card py-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted" />
          <p className="font-display mt-4 text-2xl text-muted">SIN TORNEO ACTIVO</p>
          <p className="mt-1 text-xs text-muted">Contacta con el admin para que active el torneo.</p>
        </div>
      )}

      {/* Torneo activo */}
      {tournament && (
        <>
          {/* Torneo info */}
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-0.5">Torneo</p>
              <p className="font-bold text-[#f0e6ff] text-sm">{tournament.name}</p>
            </div>
            <span className="badge-green">{phase}</span>
          </div>

          {/* Stats */}
          {standing && (
            <div className="grid grid-cols-3 gap-3">
              <div
                className="rounded-lg py-5 text-center"
                style={{ background: "#1e1945", border: "1px solid rgba(255,0,144,0.3)" }}
              >
                <p className="font-display text-3xl text-neon-pink">
                  {standing.ranking_position ?? "—"}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5">Ranking</p>
              </div>
              <div
                className="rounded-lg py-5 text-center"
                style={{ background: "#1e1945", border: "1px solid rgba(0,255,101,0.3)" }}
              >
                <p className="font-display text-3xl text-neon-green">
                  {standing.matches_won}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5">Victorias</p>
              </div>
              <div
                className="rounded-lg py-5 text-center"
                style={{ background: "#1e1945", border: "1px solid rgba(0,229,255,0.3)" }}
              >
                <p className="font-display text-3xl text-neon-cyan">
                  {standing.points_scored}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5">Puntos</p>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/tournament/${tournament.id}`}
              className="card-hover flex flex-col items-center gap-3 py-6"
            >
              <Calendar className="h-7 w-7 text-neon-pink" />
              <span className="font-display text-lg text-[#f0e6ff]" style={{ letterSpacing: "0.05em" }}>PARTIDOS</span>
            </Link>
            <Link
              href={`/tournament/${tournament.id}?tab=standings`}
              className="card-hover flex flex-col items-center gap-3 py-6"
            >
              <BarChart3 className="h-7 w-7 text-neon-cyan" />
              <span className="font-display text-lg text-[#f0e6ff]" style={{ letterSpacing: "0.05em" }}>CLASIF.</span>
            </Link>
            <Link
              href={`/tournament/${tournament.id}?tab=team`}
              className="card-hover flex flex-col items-center gap-3 py-6"
            >
              <Users className="h-7 w-7 text-neon-green" />
              <span className="font-display text-lg text-[#f0e6ff]" style={{ letterSpacing: "0.05em" }}>EQUIPO</span>
            </Link>
            {tournament.status === "finals_active" && (
              <Link
                href={`/tournament/${tournament.id}?tab=finals`}
                className="card-hover flex flex-col items-center gap-3 py-6"
              >
                <Trophy className="h-7 w-7 text-neon-yellow" />
                <span className="font-display text-lg text-[#f0e6ff]" style={{ letterSpacing: "0.05em" }}>FINALES</span>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
