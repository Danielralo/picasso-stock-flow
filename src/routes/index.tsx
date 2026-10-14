import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Home, LogOut, Package, ShoppingCart, Truck, Users } from "lucide-react";
import { Login, type Sesion } from "@/components/picasso/Login";
import { Dashboard, Entregar, Reabastecer, Reportes, Usuarios } from "@/components/picasso/views";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Picasso Autosport — Inventario del taller" },
      {
        name: "description",
        content:
          "Control de insumos, entregas, usuarios y bitácora para el taller de hojalatería y pintura Picasso Autosport.",
      },
      { property: "og:title", content: "Picasso Autosport — Inventario del taller" },
      {
        property: "og:description",
        content: "Control de insumos, entregas, usuarios y bitácora del taller Picasso Autosport.",
      },
    ],
  }),
  component: App,
});

type Seccion = "inicio" | "insumos" | "usuarios" | "reportes";
type Vista = "inicio" | "reabastecer" | "entregar" | "usuarios" | "reportes";

const SIDEBAR: Record<Seccion, { titulo: string; items: { id: Vista; label: string; icon: typeof Home }[] }> = {
  inicio: { titulo: "Inicio", items: [{ id: "inicio", label: "Panel general", icon: Home }] },
  insumos: {
    titulo: "Insumos",
    items: [
      { id: "reabastecer", label: "Reabastecer", icon: Truck },
      { id: "entregar", label: "Entregar", icon: ShoppingCart },
    ],
  },
  usuarios: { titulo: "Usuarios", items: [{ id: "usuarios", label: "Cuentas registradas", icon: Users }] },
  reportes: { titulo: "Reportes", items: [{ id: "reportes", label: "Bitácora", icon: FileText }] },
};

function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [seccion, setSeccion] = useState<Seccion>("inicio");
  const [vista, setVista] = useState<Vista>("inicio");
  const logged = !!sesion;
  const setLogged = (_: false) => setSesion(null);

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
  void logged;
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
                setLogged(false);
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
            {vista === "inicio" && <Dashboard nombre={sesion.nombre} rol={esAdmin ? "Administrador (Dueño)" : "Encargado"} />}
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
