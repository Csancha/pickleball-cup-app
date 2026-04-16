"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, LogOut, Settings, ChevronDown } from "lucide-react";
import { useState } from "react";

interface AdminNavProps {
  profile: {
    full_name: string;
    email: string;
    role: string;
  };
}

export default function AdminNav({ profile }: AdminNavProps) {
  const pathname = usePathname();
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold text-gray-900 sm:block">
            Pickleball Cup
          </span>
          <span className="badge badge-blue ml-1">Admin</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          <NavLink href="/admin" label="Dashboard" active={pathname === "/admin"} />
        </nav>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block max-w-32 truncate font-medium">
              {profile.full_name}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">{profile.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );
}
