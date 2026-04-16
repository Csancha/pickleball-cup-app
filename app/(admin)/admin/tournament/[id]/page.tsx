import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import TournamentAdminView from "@/components/admin/TournamentAdminView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("name")
    .eq("id", id)
    .single();
  return { title: data?.name ?? "Torneo" };
}

export default async function TournamentAdminPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select(`
      *,
      teams(id, name, color, rank_seed, is_active),
      tournament_players(
        id, player_id, team_id, seed_order, total_byes, total_matches_played,
        players(id, display_name, phone, avatar_url)
      ),
      rounds(id, round_number, phase, status, starts_at, ends_at),
      team_standings(id, team_id, matches_played, matches_won, matches_drawn, matches_lost, points_scored, bonus_points, total_points)
    `)
    .eq("id", id)
    .single();

  if (!tournament) notFound();

  return <TournamentAdminView tournament={tournament} />;
}
