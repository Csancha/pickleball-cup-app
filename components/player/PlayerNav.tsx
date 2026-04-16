"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { leaveGame } from "@/app/(player)/player-actions";
import { Home, Calendar, BarChart3, Users, LogOut } from "lucide-react";

export default function PlayerNav({ playerName }: { playerName: string }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <>
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 pt-safe"
        style={{
          background: "linear-gradient(180deg, #0d0b1a 0%, rgba(13,11,26,0.95) 100%)",
          borderBottom: "1px solid rgba(100,80,200,0.2)",
        }}
      >
        <Link href="/" className="font-display text-lg text-neon-pink" style={{ letterSpacing: "0.05em" }}>
          PICKLEBALL CUP
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted truncate max-w-[120px]">
            {playerName}
          </span>
          <form action={leaveGame}>
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-md transition-all"
              style={{ border: "1px solid rgba(255,51,85,0.4)", color: "#ff3355" }}
              title="Salir"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </header>
    </>
  );
}
