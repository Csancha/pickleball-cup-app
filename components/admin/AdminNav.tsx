"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface AdminNavProps {
  profile: { full_name: string; email: string; role: string };
}

export default function AdminNav({ profile }: AdminNavProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
      style={{
        background: "rgba(13,11,26,0.97)",
        borderBottom: "1px solid rgba(100,80,200,0.25)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Link href="/admin" className="flex items-center gap-3">
        <span className="font-display text-xl text-neon-pink" style={{ letterSpacing: "0.05em" }}>
          PICKLEBALL CUP
        </span>
        <span className="badge-pink">ADMIN</span>
      </Link>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-bold text-muted sm:block truncate max-w-[120px]">
          {profile.full_name}
        </span>
        <button
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-all"
          style={{ border: "1px solid rgba(255,51,85,0.4)", color: "#ff3355" }}
          title="Cerrar sesión"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
