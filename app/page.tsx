import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0d0b1a]">
      {/* Stripe accent */}
      <div className="stripe-accent w-full" />

      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-display text-2xl text-neon-pink"
            style={{ letterSpacing: "0.05em" }}
          >
            PICKLEBALL CUP
          </span>
        </div>
        <Link
          href="/login"
          className="text-xs font-black uppercase tracking-widest text-muted hover:text-[#f0e6ff] transition-colors"
        >
          Admin
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">

        {/* Big title */}
        <div className="mb-2">
          <p className="font-display text-[11px] tracking-[0.4em] text-muted uppercase mb-2">
            ★ Torneo Oficial ★
          </p>
          <h1
            className="font-display leading-none"
            style={{
              fontSize: "clamp(4rem, 20vw, 9rem)",
              color: "#f0e6ff",
              textShadow: "0 0 30px rgba(255,0,144,0.4), 0 0 60px rgba(255,0,144,0.15)",
              letterSpacing: "0.02em",
            }}
          >
            PICKLEBALL
          </h1>
          <h2
            className="font-display leading-none"
            style={{
              fontSize: "clamp(2.5rem, 14vw, 6rem)",
              color: "#ff0090",
              textShadow: "0 0 20px rgba(255,0,144,0.8)",
              letterSpacing: "0.05em",
            }}
          >
            WORLD CUP
          </h2>
        </div>

        {/* Decorative year */}
        <p
          className="font-display mb-10 mt-4"
          style={{
            fontSize: "clamp(1.2rem, 6vw, 2.5rem)",
            color: "#00e5ff",
            textShadow: "0 0 15px rgba(0,229,255,0.7)",
            letterSpacing: "0.3em",
          }}
        >
          ·· 2025 ··
        </p>

        {/* CTA buttons */}
        <div className="flex w-full max-w-xs flex-col gap-4">
          <Link
            href="/join"
            className="btn-primary w-full py-4 text-base"
          >
            ▶ ENTRAR AL TORNEO
          </Link>
          <Link
            href="/login"
            className="btn-secondary w-full py-4 text-base"
          >
            PANEL ADMIN
          </Link>
        </div>

        {/* Decorative lines */}
        <div className="mt-14 flex items-center gap-3 text-muted">
          <div className="h-px w-12 bg-[rgba(100,80,200,0.4)]" />
          <span className="font-display text-xs tracking-widest text-muted">EMPAREJAMIENTOS · CLASIFICACIÓN · FINALES</span>
          <div className="h-px w-12 bg-[rgba(100,80,200,0.4)]" />
        </div>
      </main>

      {/* Footer */}
      <div className="stripe-accent w-full" />
      <footer className="px-5 py-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
          PICKLEBALL CUP — SISTEMA DE TORNEOS
        </p>
      </footer>
    </div>
  );
}
