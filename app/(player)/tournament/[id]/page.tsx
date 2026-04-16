import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Metadata } from "next";
import PlayerTournamentView from "@/components/player/PlayerTournamentView";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createAdminClient();
  const { data } = await supabase.from("tournaments").select("name").eq("id", id).single();
  return { title: data?.name ?? "Torneo" };
}

export default async function PlayerTournamentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;

  const cookieStore = await cookies();
  const playerId = cookieStore.get("player_id")?.value;
  if (!playerId) redirect("/join");

  const supabase = await createAdminClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name")
    .eq("id", playerId)
    .single();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, status, current_phase, total_league_rounds, total_courts, match_duration_minutes, total_teams, total_players")
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  const { data: rounds } = await supabase
    .from("rounds")
    .select(`
      id, round_number, phase, status,
      matches(
        id, court_number, team_a_id, team_b_id, team_a_score, team_b_score,
        winner_team_id, is_draw, status,
        match_pairs(
          id, team_id,
          match_pair_players(player_id, players(display_name))
        )
      ),
      round_byes(player_id, team_id, players(display_name))
    `)
    .eq("tournament_id", id)
    .order("round_number");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, color")
    .eq("tournament_id", id);

  const { data: individualStandings } = await supabase
    .from("individual_standings")
    .select("*, players(display_name)")
    .eq("tournament_id", id)
    .order("ranking_position");

  const { data: teamStandings } = await supabase
    .from("team_standings")
    .select("*")
    .eq("tournament_id", id);

  return (
    <PlayerTournamentView
      tournament={tournament}
      player={player}
      rounds={(rounds as Record<string, unknown>[]) ?? []}
      teams={(teams as Record<string, unknown>[]) ?? []}
      individualStandings={(individualStandings as Record<string, unknown>[]) ?? []}
      teamStandings={(teamStandings as Record<string, unknown>[]) ?? []}
      initialTab={tab ?? "matches"}
    />
  );
}
