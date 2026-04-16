import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Trophy, Clock, CheckCircle, PlayCircle } from "lucide-react";
import type { Tournament } from "@/types";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard Admin" };

const STATUS_CONFIG = {
  draft: { label: "Borrador", badge: "badge-gray", icon: Clock },
  active: { label: "Activo", badge: "badge-blue", icon: PlayCircle },
  league_finished: { label: "Liga cerrada", badge: "badge-yellow", icon: CheckCircle },
  finals_active: { label: "Finales", badge: "badge-blue", icon: PlayCircle },
  finished: { label: "Terminado", badge: "badge-green", icon: CheckCircle },
} as const;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  const activeTournaments = (tournaments ?? []).filter(
    (t: Tournament) => t.status === "active" || t.status === "finals_active"
  );
  const draftTournaments = (tournaments ?? []).filter(
    (t: Tournament) => t.status === "draft"
  );
  const finishedTournaments = (tournaments ?? []).filter(
    (t: Tournament) => t.status === "finished"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona todos los torneos de pickleball
          </p>
        </div>
        <Link href="/admin/tournament/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:block">Nuevo torneo</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Activos"
          value={activeTournaments.length}
          color="text-blue-600"
        />
        <StatCard
          label="Borradores"
          value={draftTournaments.length}
          color="text-gray-600"
        />
        <StatCard
          label="Terminados"
          value={finishedTournaments.length}
          color="text-green-600"
        />
      </div>

      {/* Lista de torneos */}
      {!tournaments || tournaments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {(tournaments as Tournament[]).map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const config = STATUS_CONFIG[tournament.status];
  const Icon = config.icon;

  return (
    <Link
      href={`/admin/tournament/${tournament.id}`}
      className="card-hover block"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Trophy className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {tournament.name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {tournament.total_players} jugadores · {tournament.total_teams} equipos ·{" "}
              {tournament.total_courts} pistas
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {tournament.total_league_rounds} rondas de liga ·{" "}
              {tournament.match_duration_minutes} min/partido
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <span className={`badge ${config.badge} flex items-center gap-1`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="card py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Trophy className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mt-4 font-semibold text-gray-900">No hay torneos</h3>
      <p className="mt-1 text-sm text-gray-500">
        Crea tu primer torneo para empezar
      </p>
      <Link href="/admin/tournament/new" className="btn-primary mt-6 inline-flex">
        <Plus className="h-4 w-4" />
        Crear torneo
      </Link>
    </div>
  );
}
