"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  activateTournament,
  generateLeagueRounds,
  closeLeagueAndGenerateFinals,
  determineChampion,
} from "@/lib/tournament/actions";
import {
  Trophy, Users, Play, Zap, ChevronRight,
  Clock, CheckCircle, AlertCircle, Loader2, Award
} from "lucide-react";
import PlayersManager from "./PlayersManager";
import RoundsView from "./RoundsView";
import StandingsView from "./StandingsView";
import FinalsView from "./FinalsView";

type Tab = "overview" | "players" | "rounds" | "standings" | "finals";

interface TournamentAdminViewProps {
  tournament: Record<string, unknown>;
}

export default function TournamentAdminView({ tournament: t }: TournamentAdminViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const tournament = t as {
    id: string;
    name: string;
    status: string;
    current_phase: string;
    total_players: number;
    total_teams: number;
    players_per_team: number;
    total_courts: number;
    simultaneous_players: number;
    match_duration_minutes: number;
    total_league_rounds: number;
    teams: { id: string; name: string; color: string | null }[];
    tournament_players: {
      id: string; player_id: string; team_id: string;
      players: { id: string; display_name: string } | null;
    }[];
    rounds: { id: string; round_number: number; phase: string; status: string }[];
    team_standings: {
      id: string; team_id: string; matches_won: number;
      matches_played: number; matches_drawn: number; matches_lost: number;
      total_points: number; points_scored: number; bonus_points: number;
    }[];
  };

  const assignedCount = tournament.tournament_players?.length ?? 0;
  const leagueRoundsGenerated = (tournament.rounds ?? []).filter(
    (r) => r.phase === "league"
  ).length > 0;
  const leagueFinished = (tournament.rounds ?? [])
    .filter((r) => r.phase === "league")
    .every((r) => r.status === "finished") && leagueRoundsGenerated;

  async function handleActivate() {
    setError(""); setActionMsg("");
    startTransition(async () => {
      const res = await activateTournament(tournament.id);
      if (!res.success) setError(res.error);
      else { setActionMsg("Torneo activado correctamente"); router.refresh(); }
    });
  }

  async function handleGenerateRounds() {
    setError(""); setActionMsg("");
    startTransition(async () => {
      const res = await generateLeagueRounds(tournament.id);
      if (!res.success) setError(res.error);
      else {
        setActionMsg("Rondas generadas correctamente");
        setActiveTab("rounds");
        router.refresh();
      }
    });
  }

  async function handleCloseLiga() {
    setError(""); setActionMsg("");
    startTransition(async () => {
      const res = await closeLeagueAndGenerateFinals(tournament.id);
      if (!res.success) setError(res.error);
      else {
        setActionMsg("Fase final generada");
        setActiveTab("finals");
        router.refresh();
      }
    });
  }

  async function handleChampion() {
    setError(""); setActionMsg("");
    startTransition(async () => {
      const res = await determineChampion(tournament.id);
      if (!res.success) setError(res.error);
      else {
        setActionMsg("Campeón determinado");
        router.refresh();
      }
    });
  }

  const STATUS_LABEL: Record<string, string> = {
    draft: "Borrador",
    active: "Activo",
    league_finished: "Liga cerrada",
    finals_active: "Finales",
    finished: "Terminado",
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Resumen" },
    { id: "players", label: "Jugadores" },
    { id: "rounds", label: "Rondas" },
    { id: "standings", label: "Clasificación" },
    ...(tournament.status === "finals_active" || tournament.status === "finished"
      ? [{ id: "finals" as Tab, label: "Final" }]
      : []),
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
              Torneos
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <span className="text-sm text-gray-600 truncate">{tournament.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tournament.total_players} jugadores · {tournament.total_teams} equipos ·{" "}
            {tournament.total_courts} pistas · {tournament.total_league_rounds} rondas
          </p>
        </div>
        <span className={`badge shrink-0 ${
          tournament.status === "active" || tournament.status === "finals_active"
            ? "badge-blue"
            : tournament.status === "finished"
            ? "badge-green"
            : "badge-gray"
        }`}>
          {STATUS_LABEL[tournament.status]}
        </span>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {actionMsg}
        </div>
      )}

      {/* Acciones principales según estado */}
      <ActionPanel
        tournament={tournament}
        assignedCount={assignedCount}
        leagueRoundsGenerated={leagueRoundsGenerated}
        leagueFinished={leagueFinished}
        isPending={isPending}
        onActivate={handleActivate}
        onGenerateRounds={handleGenerateRounds}
        onCloseLiga={handleCloseLiga}
        onChampion={handleChampion}
      />

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
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de tab */}
      <div>
        {activeTab === "overview" && (
          <OverviewTab tournament={tournament} assignedCount={assignedCount} />
        )}
        {activeTab === "players" && (
          <PlayersManager tournament={tournament} />
        )}
        {activeTab === "rounds" && (
          <RoundsView tournamentId={tournament.id} rounds={tournament.rounds ?? []} />
        )}
        {activeTab === "standings" && (
          <StandingsView
            tournamentId={tournament.id}
            teams={tournament.teams ?? []}
            teamStandings={tournament.team_standings ?? []}
          />
        )}
        {activeTab === "finals" && (
          <FinalsView tournamentId={tournament.id} />
        )}
      </div>
    </div>
  );
}

function ActionPanel({
  tournament,
  assignedCount,
  leagueRoundsGenerated,
  leagueFinished,
  isPending,
  onActivate,
  onGenerateRounds,
  onCloseLiga,
  onChampion,
}: {
  tournament: { id: string; status: string; total_players: number };
  assignedCount: number;
  leagueRoundsGenerated: boolean;
  leagueFinished: boolean;
  isPending: boolean;
  onActivate: () => void;
  onGenerateRounds: () => void;
  onCloseLiga: () => void;
  onChampion: () => void;
}) {
  if (tournament.status === "finished") {
    return (
      <div className="card p-4 flex items-center gap-3 bg-green-50 ring-green-200">
        <Award className="h-8 w-8 text-green-600" />
        <div>
          <p className="font-semibold text-green-800">Torneo finalizado</p>
          <p className="text-sm text-green-600">El torneo ha concluido</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Acciones
      </h3>
      <div className="flex flex-wrap gap-2">
        {tournament.status === "draft" && (
          <ActionButton
            onClick={onActivate}
            disabled={isPending || assignedCount < tournament.total_players}
            pending={isPending}
            icon={<Play className="h-4 w-4" />}
            label="Activar torneo"
            hint={
              assignedCount < tournament.total_players
                ? `Faltan jugadores (${assignedCount}/${tournament.total_players})`
                : undefined
            }
            variant="primary"
          />
        )}

        {tournament.status === "active" && !leagueRoundsGenerated && (
          <ActionButton
            onClick={onGenerateRounds}
            disabled={isPending}
            pending={isPending}
            icon={<Zap className="h-4 w-4" />}
            label="Generar rondas"
            variant="primary"
          />
        )}

        {tournament.status === "active" && leagueFinished && (
          <ActionButton
            onClick={onCloseLiga}
            disabled={isPending}
            pending={isPending}
            icon={<Trophy className="h-4 w-4" />}
            label="Generar fase final"
            variant="primary"
          />
        )}

        {tournament.status === "finals_active" && (
          <ActionButton
            onClick={onChampion}
            disabled={isPending}
            pending={isPending}
            icon={<Award className="h-4 w-4" />}
            label="Determinar campeón"
            variant="primary"
          />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  pending,
  icon,
  label,
  hint,
  variant,
}: {
  onClick: () => void;
  disabled: boolean;
  pending: boolean;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  variant: "primary" | "secondary";
}) {
  return (
    <div>
      <button
        onClick={onClick}
        disabled={disabled}
        className={variant === "primary" ? "btn-primary" : "btn-secondary"}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </button>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function OverviewTab({
  tournament,
  assignedCount,
}: {
  tournament: {
    total_players: number;
    total_teams: number;
    total_courts: number;
    simultaneous_players: number;
    players_per_team: number;
    match_duration_minutes: number;
    total_league_rounds: number;
    teams: { id: string; name: string; color: string | null }[];
  };
  assignedCount: number;
}) {
  const byesPerRound = Math.max(
    0,
    tournament.total_players - tournament.simultaneous_players
  );

  const stats = [
    { label: "Total jugadores", value: `${assignedCount}/${tournament.total_players}`, icon: Users },
    { label: "Equipos", value: tournament.total_teams, icon: Users },
    { label: "Pistas", value: tournament.total_courts, icon: Trophy },
    { label: "Activos por ronda", value: tournament.simultaneous_players, icon: Play },
    { label: "Descansos por ronda", value: byesPerRound || "Ninguno", icon: Clock },
    { label: "Duración partido", value: `${tournament.match_duration_minutes} min`, icon: Clock },
    { label: "Rondas de liga", value: tournament.total_league_rounds, icon: Zap },
    { label: "Jugadores por equipo", value: tournament.players_per_team, icon: Users },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Equipos */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Equipos</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {tournament.teams?.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
            >
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: team.color ?? "#6b7280" }}
              />
              <span className="font-medium text-gray-800">{team.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
