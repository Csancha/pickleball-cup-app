import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0d0b1a]">
      <div className="stripe-accent w-full" />

      <header className="px-5 py-4">
        <Link href="/" className="font-display text-xl text-neon-pink" style={{ letterSpacing: "0.05em" }}>
          ← PICKLEBALL CUP
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        {children}
      </main>

      <div className="stripe-accent w-full" />
    </div>
  );
}
