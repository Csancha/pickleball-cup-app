import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayerNav from "@/components/player/PlayerNav";

export default async function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Si es admin y accede a /dashboard, redirigir al panel admin
  if (profile.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen bg-gray-50">
      <PlayerNav profile={profile} />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
