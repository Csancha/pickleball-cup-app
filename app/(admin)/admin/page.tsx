import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Trophy, Clock, CheckCircle, PlayCircle } from "lucide-react";
import type { Tournament } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard Admin" };

const STATUS_CONFIG = {
  draft:           { label: "Borrador",     badge: "badge-gray",   icon: Clock },
  active:          { label: "Activo",       badge: "badge-blue",   icon: PlayCircle },
  league_finished: { label: "Liga cerrada", badge: "badge-yellow", icon: CheckCircle },
  finals_active:   { label: "Finales",      badge: "badge-pink",   icon: PlayCircle },
  finished:        { label: "Terminado",    badge: "badge-green",  icon: CheckCircle },
} as const;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (tournaments ?? []) as Tournament[];
  const active   = list.filter((t) => t.status === "active" || t.status === "finals_active");
  const drafts   = list.filter((t) => t.status === "draft");
  const finished = list.filter((t) => t.status === "finished");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted mb-1">Panel de control</p>
          <h1 className="font-display text-4xl text-[#f0e6ff]" style={{ letterSpacing: "0.03em" }}>TORNEOS</h1>
        </div>
        <Link href="/admin/tournament/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo torneo</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Activos"    value={active.length}   color="text-neon-cyan" />
        <StatBox label="Borradores" value={drafts.length}   color="text-muted" />
        <StatBox label="Finalizados" value={finished.length} color="text-neon-green" />
      </div>

      {/* Tournament list */}
      {list.length === 0 ? (
        <div className="card py-16 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted" />
          <p className="font-display mt-4 text-3xl text-muted">SIN TORNEOS</p>
          <p className="mt-1 text-xs text-muted">Crea tu primer torneo para empezar</p>
          <Link href="/admin/tournament/new" className="btn-primary mt-6 inline-flex">
            <Plus className="h-4 w-4" /> Crear torneo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg py-4 text-center" style={{ background: "#1e1945", border: "1px solid rgba(100,80,200,0.25)" }}>
      <p className={`font-display text-3xl ${color}`}>{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted mt-0.5">{label}</p>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const config = STATUS_CONFIG[tournament.status];
  const Icon = config.icon;
  return (
    <Link href={`/admin/tournament/${tournament.id}`} className="card-hover block">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-[#f0e6ff] truncate">{tournament.name}</h3>
          <p className="text-xs text-muted mt-1">
            {tournament.total_players} jugadores · {tournament.total_teams} equipos · {tournament.total_courts} pistas
          </p>
          <p className="text-[10px] text-muted mt-0.5">
            {tournament.total_league_rounds} rondas · {tournament.match_duration_minutes} min/partido
          </p>
        </div>
        <span className={`${config.badge} flex items-center gap-1 shrink-0`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </div>
    </Link>
  );
}
