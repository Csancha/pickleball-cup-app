import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Admin Login" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <p className="font-display text-[10px] tracking-[0.4em] text-muted mb-2">ACCESO RESTRINGIDO</p>
        <h1
          className="font-display leading-tight"
          style={{
            fontSize: "clamp(2rem, 10vw, 3rem)",
            color: "#f0e6ff",
            textShadow: "0 0 20px rgba(255,0,144,0.3)",
          }}
        >
          PANEL ADMIN
        </h1>
      </div>
      <LoginForm />
    </div>
  );
}
