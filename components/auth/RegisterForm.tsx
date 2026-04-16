"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerSchema } from "@/lib/validations/auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"jugador" | "admin">("jugador");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsed = registerSchema.safeParse({
      full_name: fullName,
      email,
      password,
      confirm_password: confirmPassword,
      role,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Este email ya está registrado"
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    // Redirigir según rol
    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card p-6 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="label">
            Nombre completo
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input"
            placeholder="Carlos García"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="label">Tipo de cuenta</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("jugador")}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ring-1 ${
                role === "jugador"
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              Jugador
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ring-1 ${
                role === "admin"
                  ? "bg-brand-600 text-white ring-brand-600"
                  : "bg-white text-gray-700 ring-gray-300 hover:bg-gray-50"
              }`}
            >
              Administrador
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creando cuenta...
            </>
          ) : (
            "Crear cuenta"
          )}
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
