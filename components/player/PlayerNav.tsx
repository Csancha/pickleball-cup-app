"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function PlayerNav({
  profile,
}: {
  profile: { full_name: string; email: string; role: string };
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Pickleball Cup</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-medium text-sm text-gray-900 truncate">{profile.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{profile.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
