"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTournament } from "@/lib/tournament/actions";
import { Info, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface FormData {
  name: string;
  total_players: number;
  total_teams: number;
  players_per_team: number;
  total_courts: number;
  match_duration_minutes: number;
  total_league_rounds: number;
}

const INITIAL_FORM: FormData = {
  name: "",
  total_players: 12,
  total_teams: 2,
  players_per_team: 6,
  total_courts: 3,
  match_duration_minutes: 15,
  total_league_rounds: 6,
};

export default function CreateTournamentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validación en tiempo real
  const isConsistent =
    form.total_players > 0 &&
    form.total_teams > 0 &&
    form.players_per_team > 0 &&
    form.total_players === form.total_teams * form.players_per_team;

  const simultaneousPlayers = form.total_courts * 4;
  const byesPerRound = Math.max(0, form.total_players - simultaneousPlayers);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-sync total_players cuando cambian teams × players_per_team
      if (key === "total_teams" || key === "players_per_team") {
        const teams = key === "total_teams" ? (value as number) : next.total_teams;
        const pp = key === "players_per_team" ? (value as number) : next.players_per_team;
        if (teams > 0 && pp > 0) {
          next.total_players = teams * pp;
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConsistent) {
      setError("El número total de jugadores debe ser equipos × jugadores por equipo");
      return;
    }
    setError("");
    setLoading(true);

    const result = await createTournament(form);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/admin/tournament/${result.data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Información básica</h2>
        <div>
          <label htmlFor="name" className="label">
            Nombre del torneo
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="input"
            placeholder="Copa Pickleball 2025"
            required
            minLength={3}
          />
        </div>
      </div>

      {/* Estructura */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Estructura del torneo</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Equipos"
            id="total_teams"
            value={form.total_teams}
            onChange={(v) => setField("total_teams", v)}
            min={2}
            max={8}
            hint="Mínimo 2"
          />
          <NumberField
            label="Jugadores por equipo"
            id="players_per_team"
            value={form.players_per_team}
            onChange={(v) => setField("players_per_team", v)}
            min={2}
            max={16}
            hint="Mínimo 2"
          />
        </div>

        {/* Total calculado */}
        <div className="mt-3 rounded-lg bg-brand-50 px-4 py-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-600 shrink-0" />
          <p className="text-sm text-brand-700">
            <span className="font-semibold">Total: {form.total_players} jugadores</span>
            {" "}({form.total_teams} equipos × {form.players_per_team} jugadores)
          </p>
        </div>
      </div>

      {/* Pistas y partidos */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Pistas y formato</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Número de pistas"
            id="total_courts"
            value={form.total_courts}
            onChange={(v) => setField("total_courts", v)}
            min={1}
            max={20}
          />
          <NumberField
            label="Duración partido (min)"
            id="match_duration_minutes"
            value={form.match_duration_minutes}
            onChange={(v) => setField("match_duration_minutes", v)}
            min={5}
            max={60}
          />
        </div>

        {/* Info de simultaneidad */}
        <div className={`mt-3 rounded-lg px-4 py-3 flex items-start gap-2 ${
          byesPerRound > 0 ? "bg-yellow-50" : "bg-green-50"
        }`}>
          {byesPerRound > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                <span className="font-semibold">{simultaneousPlayers} jugadores activos</span> por ronda
                ({form.total_courts} pistas × 4). <span className="font-semibold">{byesPerRound} jugadores</span> descansarán en cada ronda.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">
                <span className="font-semibold">Todos los jugadores activos</span> en cada ronda
                ({simultaneousPlayers} plazas ≥ {form.total_players} jugadores).
              </p>
            </>
          )}
        </div>
      </div>

      {/* Rondas */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Fase de liga</h2>
        <NumberField
          label="Rondas de liga"
          id="total_league_rounds"
          value={form.total_league_rounds}
          onChange={(v) => setField("total_league_rounds", v)}
          min={1}
          max={20}
          hint="Número de rondas de la fase de liga"
        />
        <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-600">
            Duración estimada:{" "}
            <span className="font-semibold">
              {form.total_league_rounds * form.match_duration_minutes} minutos
            </span>{" "}
            ({form.total_league_rounds} rondas × {form.match_duration_minutes} min)
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      {/* Validación */}
      {!isConsistent && form.total_players > 0 && (
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700 ring-1 ring-orange-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          El total de jugadores ({form.total_players}) debe ser igual a equipos ({form.total_teams}) × jugadores por equipo ({form.players_per_team}) = {form.total_teams * form.players_per_team}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex-1"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !isConsistent || !form.name}
          className="btn-primary flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando...
            </>
          ) : (
            "Crear torneo"
          )}
        </button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  id,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input"
        min={min}
        max={max}
        required
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
