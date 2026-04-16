import Link from "next/link";
import { Trophy } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header mínimo */}
      <header className="px-4 py-4">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">Pickleball Cup</span>
        </Link>
      </header>

      {/* Contenido */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="px-4 py-4 text-center text-xs text-gray-400">
        Pickleball Cup
      </footer>
    </div>
  );
}
