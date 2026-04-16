"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPlayerSchema } from "@/lib/validations/tournament";
import { Plus, User, Loader2, X, AlertCircle } from "lucide-react";

interface Team {
  id: string;
  name: string;
  color: string | null;
}

interface TournamentPlayer {
  id: string;
  player_id: string;
  team_id: string;
  players: { id: string; display_name: string } | null;
}

interface Tournament {
  id: string;
  status: string;
  total_players: number;
  players_per_team: number;
  teams: Team[];
  tournament_players: TournamentPlayer[];
}

export default function PlayersManager({ tournament }: { tournament: Tournament }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(tournament.teams?.[0]?.id ?? "");

  const isDraft = tournament.status === "draft";

  // Agrupar jugadores por equipo
  const playersByTeam = new Map<string, TournamentPlayer[]>();
  for (const team of tournament.teams ?? []) {
    playersByTeam.set(
      team.id,
      (tournament.tournament_players ?? []).filter((tp) => tp.team_id === team.id)
    );
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = createPlayerSchema.safeParse({ display_name: newName });
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    if (!selectedTeamId) {
      setError("Selecciona un equipo");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();

      // Crear jugador
      const { data: player, error: playerError } = await supabase
        .from("players")
        .insert({ display_name: newName.trim() })
        .select("id")
        .single();

      if (playerError || !player) {
        setError(playerError?.message ?? "Error al crear jugador");
        return;
      }

      // Asignar al torneo y equipo
      const { error: assignError } = await supabase
        .from("tournament_players")
        .insert({
          tournament_id: tournament.id,
          player_id: player.id,
          team_id: selectedTeamId,
        });

      if (assignError) {
        setError(assignError.message);
        return;
      }

      setNewName("");
      setShowAddForm(false);
      router.refresh();
    });
  }

  async function handleRemovePlayer(tournamentPlayerId: string) {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tournament_players")
        .delete()
        .eq("id", tournamentPlayerId);

      if (error) setError(error.message);
      else router.refresh();
    });
  }

  const assignedCount = tournament.tournament_players?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {assignedCount}/{tournament.total_players} jugadores asignados
          </p>
          <div className="mt-1 h-2 w-40 rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-brand-500 transition-all"
              style={{ width: `${(assignedCount / tournament.total_players) * 100}%` }}
            />
          </div>
        </div>
        {isDraft && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Añadir jugador
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Formulario de añadir */}
      {showAddForm && isDraft && (
        <form onSubmit={handleAddPlayer} className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Nuevo jugador</h3>
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input"
              placeholder="Nombre del jugador"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Equipo</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="input"
            >
              {tournament.teams?.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({playersByTeam.get(team.id)?.length ?? 0}/{tournament.players_per_team})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Añadir
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista por equipos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {tournament.teams?.map((team) => {
          const players = playersByTeam.get(team.id) ?? [];
          const isFull = players.length >= tournament.players_per_team;

          return (
            <div key={team.id} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: team.color ?? "#6b7280" }}
                />
                <h3 className="font-semibold text-gray-900">{team.name}</h3>
                <span className={`ml-auto badge ${isFull ? "badge-green" : "badge-gray"}`}>
                  {players.length}/{tournament.players_per_team}
                </span>
              </div>

              {players.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  Sin jugadores asignados
                </p>
              ) : (
                <ul className="space-y-2">
                  {players.map((tp) => (
                    <li key={tp.id} className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 shrink-0">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <span className="text-sm text-gray-800 flex-1 truncate">
                        {tp.players?.display_name ?? "Jugador"}
                      </span>
                      {isDraft && (
                        <button
                          onClick={() => handleRemovePlayer(tp.id)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
