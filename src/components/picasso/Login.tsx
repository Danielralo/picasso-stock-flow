import { useEffect, useState } from "react";
import { KeyRound, LogIn, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import { Pill } from "./ui-bits";

export type Sesion = { nombre: string; usuario: string; rol: "Administrador" | "Encargado" };

const CUENTAS: Record<string, { password: string } & Sesion> = {
  hramos: { password: "picasso", nombre: "Hector Ramos", usuario: "hramos", rol: "Administrador" },
  lmarquez: { password: "encargado", nombre: "Lucía Márquez", usuario: "lmarquez", rol: "Encargado" },
};

export function Login({ onLogin }: { onLogin: (s: Sesion) => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recuperar, setRecuperar] = useState(false);
  const [cuenta, setCuenta] = useState("");
  // Desactiva el botón hasta que React esté montado: evita que un clic (o Enter)
  // antes de la hidratación recargue la página y borre los campos.
  const [hidratado, setHidratado] = useState(false);
  useEffect(() => setHidratado(true), []);

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
            const c = CUENTAS[usuario.trim().toLowerCase()];
            if (!c || c.password !== password) {
              toast.error("Usuario o contraseña incorrectos");
              return;
            }
            onLogin({ nombre: c.nombre, usuario: c.usuario, rol: c.rol });
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setCuenta(usuario);
                setRecuperar(true);
              }}
              className="text-xs font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <Pill type="submit" variant="sand" className="w-full py-3" disabled={!hidratado}>
            {hidratado ? <LogIn className="h-4 w-4" /> : null}
            {hidratado ? "Iniciar sesión" : "Cargando…"}
          </Pill>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prototipo de demostración · Admin: hramos / picasso · Encargado: lmarquez / encargado
        </p>
      </div>

      <Dialog open={recuperar} onOpenChange={setRecuperar}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Restablecer clave
            </DialogTitle>
            <DialogDescription>
              Escribe tu usuario. El administrador del taller recibirá la solicitud para asignarte una clave nueva.
            </DialogDescription>
          </DialogHeader>
          <input
            value={cuenta}
            maxLength={20}
            onChange={(e) => setCuenta(e.target.value)}
            placeholder="Usuario"
            aria-label="Usuario a recuperar"
            className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-sand"
          />
          <DialogFooter className="gap-2">
            <Pill variant="ghost" onClick={() => setRecuperar(false)}>Cancelar</Pill>
            <Pill
              variant="sand"
              disabled={cuenta.trim().length < 3}
              className="disabled:opacity-50"
              onClick={() => {
                toast.success("Solicitud enviada", { description: `Se notificó al administrador para restablecer la clave de @${cuenta.trim()}.` });
                setRecuperar(false);
              }}
            >
              Enviar solicitud
            </Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
