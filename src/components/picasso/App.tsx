import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, FileText, Home, Loader2, LogOut, Package, ShoppingCart, Truck, Users } from "lucide-react";
import { Login } from "@/components/picasso/Login";
import { Alertas, Dashboard, Entregar, Reabastecer, Reportes, Usuarios } from "@/components/picasso/views";
import { cerrarSesion, cuandoExpireLaSesion, sesionActual, type Sesion } from "@/lib/api";
import { cn } from "@/lib/utils";

/*
 * App.tsx — Estructura general: inicio de sesión, barra superior, menú lateral y la pantalla elegida.
 * La usan tanto `npm run dev` (src/routes/index.tsx) como la versión para XAMPP (spa/main.tsx).
 */

type Seccion = "inicio" | "insumos" | "usuarios" | "reportes";
type Vista = "inicio" | "alertas" | "reabastecer" | "entregar" | "usuarios" | "reportes";

const SIDEBAR: Record<Seccion, { titulo: string; items: { id: Vista; label: string; icon: typeof Home }[] }> = {
  inicio: {
    titulo: "Inicio",
    items: [
      { id: "inicio", label: "Panel general", icon: Home },
      { id: "alertas", label: "Alertas de stock", icon: BellRing },
    ],
  },
  insumos: {
    titulo: "Insumos",
    items: [
      { id: "reabastecer", label: "Reabastecer", icon: Truck },
      { id: "entregar", label: "Entregar", icon: ShoppingCart },
    ],
  },
  usuarios: { titulo: "Usuarios", items: [{ id: "usuarios", label: "Cuentas registradas", icon: Users }] },
  reportes: { titulo: "Reportes", items: [{ id: "reportes", label: "Consumo y bitácora", icon: FileText }] },
};

export function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [revisando, setRevisando] = useState(true);
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [vista, setVista] = useState<Vista>("inicio");

  useEffect(() => {
    // Si ya había una sesión abierta en el servidor (cookie de PHP), se recupera al recargar la página.
    // RNF-09: si se abrió el enlace del correo (?restablecer=…), se cierra la sesión que hubiera
    // para mostrar la pantalla «Crear nueva contraseña».
    const vieneDelCorreo = new URLSearchParams(window.location.search).has("restablecer");
    (vieneDelCorreo ? cerrarSesion().then(() => null) : sesionActual())
      .then(setSesion)
      .catch(() => setSesion(null))
      .finally(() => setRevisando(false));
    // Si el servidor responde que la sesión terminó (o la cuenta se dio de baja), se regresa al inicio de sesión.
    cuandoExpireLaSesion((mensaje) => {
      setSesion(null);
      toast.error(mensaje);
    });
  }, []);

  const salir = async () => {
    try {
      await cerrarSesion();
    } finally {
      setSesion(null);
    }
  };

  if (revisando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando con el servidor…
      </main>
    );
  }

  if (!sesion) {
    return (
      <Login
        onLogin={(s) => {
          setSesion(s);
          setSeccion("inicio");
          setVista("inicio");
        }}
      />
    );
  }
  const esAdmin = sesion.rol === "Administrador";

  const irA = (s: Seccion) => {
    setSeccion(s);
    setVista(SIDEBAR[s].items[0]!.id);
  };

  const topbar = [
    { id: "insumos" as const, label: "Insumos", icon: Package },
    ...(esAdmin
      ? [
          { id: "usuarios" as const, label: "Usuarios", icon: Users },
          { id: "reportes" as const, label: "Reportes", icon: FileText },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <button onClick={() => irA("inicio")} className="text-left">
            <span className="text-lg font-extrabold tracking-tight">
              PICASSO <span className="text-[oklch(0.58_0.22_27)]">/</span> AUTOSPORT
            </span>
            <span className="block text-[11px] uppercase tracking-[0.2em] text-primary-foreground/60">Inventario</span>
          </button>

          <nav className="flex flex-wrap items-center gap-2">
            {topbar.map((t) => (
              <button
                key={t.id}
                onClick={() => irA(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  seccion === t.id
                    ? "bg-sand text-sand-foreground"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground",
                )}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
            <button
              onClick={() => {
                void salir();
                irA("inicio");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 px-4 py-2 text-sm font-semibold text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card px-4 py-6 lg:block">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {SIDEBAR[seccion].titulo}
          </p>
          <nav className="mt-3 space-y-1">
            {SIDEBAR[seccion].items.map((item) => (
              <button
                key={item.id}
                onClick={() => setVista(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  vista === item.id
                    ? "bg-sand text-sand-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" /> {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl">
            {vista === "inicio" && <Dashboard nombre={sesion.nombre} rol={esAdmin ? "Administrador (Dueño)" : "Encargado"} onVerAlertas={() => setVista("alertas")} />}
            {vista === "alertas" && <Alertas />}
            {vista === "reabastecer" && <Reabastecer />}
            {vista === "entregar" && <Entregar />}
            {esAdmin && vista === "usuarios" && <Usuarios />}
            {esAdmin && vista === "reportes" && <Reportes />}
          </div>
        </main>
      </div>
    </div>
  );
}
