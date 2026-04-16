import { z } from "zod";

export const createTournamentSchema = z
  .object({
    name: z
      .string()
      .min(3, "El nombre debe tener al menos 3 caracteres")
      .max(100, "El nombre no puede superar 100 caracteres"),
    total_players: z
      .number()
      .int("Debe ser un número entero")
      .min(4, "Se necesitan al menos 4 jugadores")
      .max(64, "Máximo 64 jugadores"),
    total_teams: z
      .number()
      .int()
      .min(2, "Se necesitan al menos 2 equipos")
      .max(8, "Máximo 8 equipos"),
    players_per_team: z
      .number()
      .int()
      .min(2, "Mínimo 2 jugadores por equipo")
      .max(16, "Máximo 16 jugadores por equipo"),
    total_courts: z
      .number()
      .int()
      .min(1, "Se necesita al menos 1 pista")
      .max(20, "Máximo 20 pistas"),
    match_duration_minutes: z
      .number()
      .int()
      .min(5, "Mínimo 5 minutos por partido")
      .max(60, "Máximo 60 minutos por partido"),
    total_league_rounds: z
      .number()
      .int()
      .min(1, "Se necesita al menos 1 ronda")
      .max(20, "Máximo 20 rondas"),
  })
  .refine(
    (data) => data.total_players === data.total_teams * data.players_per_team,
    {
      message:
        "El número total de jugadores debe ser igual a equipos × jugadores por equipo",
      path: ["total_players"],
    }
  );

export type CreateTournamentSchema = z.infer<typeof createTournamentSchema>;

export const submitResultSchema = z.object({
  match_id: z.string().uuid(),
  team_a_score: z
    .number()
    .int()
    .min(0, "La puntuación no puede ser negativa")
    .max(99),
  team_b_score: z
    .number()
    .int()
    .min(0, "La puntuación no puede ser negativa")
    .max(99),
});

export type SubmitResultSchema = z.infer<typeof submitResultSchema>;

export const createPlayerSchema = z.object({
  display_name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede superar 50 caracteres"),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]{7,15}$/, "Formato de teléfono no válido")
    .optional()
    .or(z.literal("")),
});

export type CreatePlayerSchema = z.infer<typeof createPlayerSchema>;
