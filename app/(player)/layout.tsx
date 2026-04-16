import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import PlayerNav from "@/components/player/PlayerNav";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const playerId = cookieStore.get("player_id")?.value;
  const playerName = cookieStore.get("player_name")?.value;

  if (!playerId) redirect("/join");

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <PlayerNav playerName={playerName ?? "Jugador"} />
      <main className="mx-auto max-w-lg px-4 py-5 mb-nav">
        {children}
      </main>
    </div>
  );
}
