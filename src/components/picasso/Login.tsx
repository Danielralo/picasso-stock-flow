import { useEffect, useState } from "react";
import { KeyRound, Loader2, LogIn, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import { iniciarSesion, restablecerClave, revisarEnlace, solicitarClave, type Sesion } from "@/lib/api";
import { Pill } from "./ui-bits";

export type { Sesion };

export function Login({ onLogin }: { onLogin: (s: Sesion) => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [recuperar, setRecuperar] = useState(false);
  const [cuenta, setCuenta] = useState("");
  // Desactiva el botón hasta que React esté montado: evita que un clic (o Enter)
  // antes de la hidratación recargue la página y borre los campos.
  const [hidratado, setHidratado] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  // RNF-09: el enlace del correo abre el sistema con ?restablecer=… en la dirección
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setHidratado(true);
    setToken(new URLSearchParams(window.location.search).get("restablecer"));
  }, []);

  const input =
    "w-full rounded-full border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-sand focus:ring-2 focus:ring-sand/50";

  if (token) {
    return (
      <NuevaClave
        token={token}
        onListo={(username) => {
          // Quita ?restablecer=… de la dirección y regresa al inicio de sesión
          window.history.replaceState(null, "", window.location.pathname);
          setToken(null);
          if (username) setUsuario(username);
        }}
      />
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 shadow-card sm:p-10">
        <Encabezado />

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setEntrando(true);
            try {
              // El servidor revisa la contraseña, que la cuenta esté ACTIVA (RNF-08) y registra LOGIN en la bitácora
              onLogin(await iniciarSesion(usuario.trim().toLowerCase(), password));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión");
            } finally {
              setEntrando(false);
            }
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
          <Pill type="submit" variant="sand" className="w-full py-3" disabled={!hidratado || entrando}>
            {hidratado ? <LogIn className="h-4 w-4" /> : null}
            {!hidratado ? "Cargando…" : entrando ? "Entrando…" : "Iniciar sesión"}
          </Pill>
        </form>

      </div>

      <Dialog open={recuperar} onOpenChange={setRecuperar}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Restablecer clave
            </DialogTitle>
            <DialogDescription>
              Escribe tu usuario. Si eres Encargado, el Administrador recibirá la solicitud para asignarte una clave nueva.
              Si eres Administrador, te llegará un correo con un enlace para crear tu nueva contraseña.
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
              disabled={cuenta.trim().length < 3 || enviando}
              className="disabled:opacity-50"
              onClick={async () => {
                // RNF-09: el servidor revisa que la cuenta exista y esté activa;
                // al Encargado lo atiende el Administrador y al Administrador le manda un correo
                setEnviando(true);
                try {
                  const r = await solicitarClave(cuenta.trim().toLowerCase());
                  toast.success(r.porCorreo ? "Correo enviado" : "Solicitud enviada", { description: r.mensaje, duration: 8000 });
                  setRecuperar(false);
                } catch (err) {
                  toast.error("No se envió la solicitud", { description: err instanceof Error ? err.message : "" });
                } finally {
                  setEnviando(false);
                }
              }}
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {enviando ? "Enviando…" : "Enviar solicitud"}
            </Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Encabezado() {
  return (
    <>
      <img src={logo} alt="Picasso Autosport" width={1088} height={624} className="mx-auto h-20 w-auto object-contain" />
      <p className="mt-2 text-center text-sm text-muted-foreground">Control de inventario · Hojalatería y pintura</p>
    </>
  );
}

/**
 * RNF-09 (Administrador): pantalla que abre el enlace del correo.
 * Primero pregunta al servidor si el enlace sigue sirviendo y después guarda la contraseña nueva.
 */
function NuevaClave({ token, onListo }: { token: string; onListo: (username?: string) => void }) {
  const [estado, setEstado] = useState<{ username?: string; error?: string } | null>(null);
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    revisarEnlace(token)
      .then((r) => setEstado({ username: r.username }))
      .catch((e) => setEstado({ error: e instanceof Error ? e.message : "El enlace no es válido." }));
  }, [token]);

  const corta = nueva.length < 6;
  const distinta = nueva !== confirmar;
  const input =
    "w-full rounded-full border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-sand focus:ring-2 focus:ring-sand/50";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-8 shadow-card sm:p-10">
        <Encabezado />
        <h1 className="mt-8 flex items-center gap-2 text-lg font-bold text-foreground">
          <KeyRound className="h-5 w-5" /> Crear nueva contraseña
        </h1>

        {!estado ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Revisando el enlace…
          </p>
        ) : estado.error ? (
          <>
            <p className="mt-3 rounded-2xl bg-danger px-4 py-3 text-sm text-danger-foreground">{estado.error}</p>
            <Pill variant="sand" className="mt-6 w-full py-3" onClick={() => onListo()}>
              Ir a iniciar sesión
            </Pill>
          </>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setIntentado(true);
              if (corta || distinta) return;
              setGuardando(true);
              try {
                const r = await restablecerClave(token, nueva);
                toast.success("Contraseña actualizada", { description: r.mensaje });
                onListo(estado.username);
              } catch (err) {
                toast.error("No se cambió la contraseña", { description: err instanceof Error ? err.message : "" });
              } finally {
                setGuardando(false);
              }
            }}
          >
            <p className="text-sm text-muted-foreground">
              Cuenta <b className="text-foreground">@{estado.username}</b>. Escribe tu nueva contraseña (mínimo 6 caracteres).
            </p>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="password" className={input} value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva contraseña" aria-label="Nueva contraseña" autoFocus />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="password" className={input} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repite la contraseña" aria-label="Repite la contraseña" />
            </div>
            {intentado && (corta || distinta) && (
              <p className="text-xs font-medium text-destructive">
                {corta ? "La contraseña debe tener al menos 6 caracteres." : "Las dos contraseñas no coinciden."}
              </p>
            )}
            <Pill type="submit" variant="sand" className="w-full py-3" disabled={guardando}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {guardando ? "Guardando…" : "Guardar contraseña"}
            </Pill>
            <button type="button" onClick={() => onListo()} className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground">
              Cancelar
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
