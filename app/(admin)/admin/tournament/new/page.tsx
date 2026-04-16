import { Metadata } from "next";
import CreateTournamentForm from "@/components/admin/CreateTournamentForm";

export const metadata: Metadata = { title: "Nuevo torneo" };

export default function NewTournamentPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear torneo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura todos los parámetros del torneo
        </p>
      </div>
      <CreateTournamentForm />
    </div>
  );
}
