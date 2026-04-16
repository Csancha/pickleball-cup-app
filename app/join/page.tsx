import { createAdminClient } from "@/lib/supabase/server";
import { joinAsPlayer } from "@/app/(player)/player-actions";
import Link from "next/link";

export const metadata = { title: "Unirse al torneo" };

export default async function JoinPage() {
  const supabase = await createAdminClient();

  // Obtener torneos activos con sus jugadores
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select(`
      id, name, status,
      teams(id, name, color,
        tournament_players(
          player_id,
          players(id, display_name)
        )
      )
    `)
    .not("status", "in", '("finished")')
    .order("created_at", { ascending: false })
    .limit(3);

  const activeTournaments = tournaments ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-[#0d0b1a]">
      <div className="stripe-accent w-full" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="font-display text-xl text-neon-pink" style={{ letterSpacing: "0.05em" }}>
          ← PICKLEBALL CUP
        </Link>
      </header>

      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-md">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1
              className="font-display leading-tight"
              style={{
                fontSize: "clamp(2.5rem, 12vw, 4rem)",
                color: "#f0e6ff",
                textShadow: "0 0 20px rgba(255,0,144,0.4)",
              }}
            >
              ¿QUIÉN ERES?
            </h1>
            <p className="mt-2 text-xs font-black uppercase tracking-widest text-muted">
              Selecciona tu nombre para entrar
            </p>
          </div>

          {activeTournaments.length === 0 && (
            <div className="card py-12 text-center">
              <p className="font-display text-2xl text-muted">SIN TORNEO ACTIVO</p>
              <p className="mt-2 text-xs text-muted">El admin aún no ha creado ningún torneo.</p>
            </div>
          )}

          {activeTournaments.map((tournament) => (
            <div key={tournament.id} className="mb-8">
              {/* Tournament name */}
              <div className="mb-4 rounded-lg border border-[rgba(0,229,255,0.3)] bg-[#1e1945] px-4 py-3">
                <p className="text-xs font-black uppercase tracking-widest text-neon-cyan mb-0.5">Torneo</p>
                <p className="font-display text-xl text-[#f0e6ff]" style={{ letterSpacing: "0.03em" }}>
                  {tournament.name}
                </p>
              </div>

              {/* Teams and players */}
              {(tournament.teams ?? []).map((team) => {
                const players = ((team.tournament_players ?? []) as { players: unknown }[])
                  .map((tp) => tp.players as { id: string; display_name: string } | null)
                  .filter(Boolean) as { id: string; display_name: string }[];

                if (players.length === 0) return null;

                return (
                  <div key={team.id} className="mb-4">
                    {/* Team header */}
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: team.color ?? "#888", boxShadow: `0 0 6px ${team.color ?? "#888"}` }}
                      />
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: team.color ?? "#888" }}>
                        {team.name}
                      </p>
                    </div>

                    {/* Player buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {players.map((player) => (
                        <form key={player.id} action={joinAsPlayer}>
                          <input type="hidden" name="player_id" value={player.id} />
                          <input type="hidden" name="player_name" value={player.display_name} />
                          <button
                            type="submit"
                            className="player-join-btn w-full rounded-md px-4 py-4 text-sm font-bold transition-all active:scale-95"
                            style={{
                              background: "#1e1945",
                              border: `1px solid rgba(100,80,200,0.3)`,
                              color: "#f0e6ff",
                            }}
                          >
                            {player.display_name}
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Back */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-black uppercase tracking-widest text-muted hover:text-[#f0e6ff] transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </main>

      <div className="stripe-accent w-full" />
    </div>
  );
}
