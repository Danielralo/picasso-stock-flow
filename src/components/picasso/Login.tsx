import { useState } from "react";
import { LogIn, Lock, User } from "lucide-react";
import logo from "@/assets/logo.png";
import { Pill } from "./ui-bits";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [usuario, setUsuario] = useState("hramos");
  const [password, setPassword] = useState("picasso");

  const input =
    "w-full rounded-full border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-sand focus:ring-2 focus:ring-sand/50";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 shadow-card sm:p-10">
        <img src={logo} alt="Picasso Autosport" width={1088} height={624} className="mx-auto h-20 w-auto object-contain" />
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Control de inventario · Hojalatería y pintura
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
        >
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className={input} value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuario" aria-label="Usuario" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              aria-label="Contraseña"
            />
          </div>
          <Pill type="submit" variant="sand" className="w-full py-3">
            <LogIn className="h-4 w-4" /> Iniciar sesión
          </Pill>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prototipo de demostración · acceso simulado
        </p>
      </div>
    </main>
  );
}
