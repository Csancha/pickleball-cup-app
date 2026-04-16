import { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
        <p className="mt-2 text-sm text-gray-500">
          Regístrate para participar en el torneo
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
