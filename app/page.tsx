import Link from "next/link";
import { Trophy, Users, Zap, BarChart3, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      {/* Header */}
      <header className="border-b border-brand-800/50 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-400">
              <Trophy className="h-5 w-5 text-brand-950" />
            </div>
            <span className="text-lg font-bold text-white">Pickleball Cup</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-brand-300 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-medium text-brand-950 hover:bg-brand-300 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-800/60 px-4 py-2 text-sm text-brand-300">
              <Zap className="h-4 w-4" />
              Torneos configurables · Emparejamientos automáticos
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Gestiona torneos de{" "}
              <span className="text-brand-400">pickleball</span> por equipos
            </h1>
            <p className="mb-10 text-lg text-brand-300 sm:text-xl">
              Configura el número de jugadores, pistas y rondas. La app genera
              los emparejamientos automáticamente, gestiona descansos y
              mantiene la clasificación actualizada.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-400 px-8 py-4 text-base font-semibold text-brand-950 hover:bg-brand-300 transition-colors sm:w-auto"
              >
                Empieza gratis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-700 px-8 py-4 text-base font-semibold text-white hover:bg-brand-800/50 transition-colors sm:w-auto"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Zap className="h-6 w-6 text-brand-400" />}
                title="Emparejamientos automáticos"
                description="El algoritmo genera rondas equilibradas, minimizando repetición de compañeros y rivales, con rotación justa de descansos."
              />
              <FeatureCard
                icon={<Users className="h-6 w-6 text-brand-400" />}
                title="Configurable al 100%"
                description="Define el número de jugadores, equipos, pistas, duración de partidos y rondas de liga. Sin valores fijos."
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6 text-brand-400" />}
                title="Clasificaciones en tiempo real"
                description="Standings de equipos e individuales que se recalculan automáticamente al registrar cada resultado."
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6 text-brand-400" />}
                title="Roles diferenciados"
                description="El admin gestiona todo el torneo. Los jugadores consultan su equipo, partidos, pista asignada y clasificación."
              />
              <FeatureCard
                icon={<Trophy className="h-6 w-6 text-brand-400" />}
                title="Fase final inteligente"
                description="Los rankings individuales de la liga determinan las parejas de la fase final. El sistema lo genera automáticamente."
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6 text-brand-400" />}
                title="Mobile-first"
                description="Diseñado para consultar desde el móvil durante el torneo. Funciona bien en pantallas de todos los tamaños."
              />
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="px-4 py-16 border-t border-brand-800/50">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl">
              ¿Cómo funciona?
            </h2>
            <div className="space-y-6">
              {[
                {
                  step: "01",
                  title: "El admin crea el torneo",
                  desc: "Define nombre, número de jugadores, equipos, pistas y rondas.",
                },
                {
                  step: "02",
                  title: "Asigna jugadores a equipos",
                  desc: "Crea jugadores o vincula cuentas existentes y asígnalos a cada equipo.",
                },
                {
                  step: "03",
                  title: "Genera las rondas",
                  desc: "Un clic genera todas las rondas de liga con emparejamientos optimizados.",
                },
                {
                  step: "04",
                  title: "Registra resultados",
                  desc: "El admin introduce los marcadores. Los standings se actualizan solos.",
                },
                {
                  step: "05",
                  title: "Fase final automática",
                  desc: "Al cerrar la liga, la app genera las parejas finales por ranking interno.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-400 text-sm font-bold text-brand-950">
                    {item.step}
                  </div>
                  <div className="pt-1">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="text-brand-300 text-sm mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-800/50 px-4 py-8 text-center text-sm text-brand-500">
        <p>Pickleball Cup — Gestión de torneos por equipos</p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-brand-900/60 p-6 ring-1 ring-brand-800">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-800">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-brand-400 leading-relaxed">{description}</p>
    </div>
  );
}
