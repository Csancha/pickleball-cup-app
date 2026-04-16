import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido de nuevo</h1>
        <p className="mt-2 text-sm text-gray-500">
          Inicia sesión para acceder al torneo
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
