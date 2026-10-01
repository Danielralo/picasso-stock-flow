import { useMemo, useState } from "react";
import {
  Ban,
  Bell,
  Car,
  Download,
  FileSpreadsheet,
  Minus,
  NotebookPen,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UserPlus,
} from "lucide-react";
import { BITACORA, CATEGORIAS, INSUMOS, USUARIOS, estadoStock, type Insumo } from "@/lib/picasso-data";
import { Badge, Card, CardHeader, PageTitle, Pill, Stepper, Td, Th } from "./ui-bits";

const rowHover = "border-t border-border/70 transition-colors hover:bg-secondary/70";

/* ---------------- Buscador + filtro de categoría ---------------- */

function BuscadorInsumos({
  busqueda,
  setBusqueda,
  categoria,
  setCategoria,
}: {
  busqueda: string;
  setBusqueda: (v: string) => void;
  categoria: string;
  setCategoria: (v: string) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar insumo por nombre…"
          aria-label="Buscar insumo por nombre"
          className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoria(c)}
            aria-pressed={categoria === c}
            className={
              categoria === c
                ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors"
                : "rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function filtrarInsumos(busqueda: string, categoria: string): Insumo[] {
  const q = busqueda.trim().toLowerCase();
  return INSUMOS.filter(
    (i) =>
      i.nombre.toLowerCase().includes(q) &&
      (categoria === "Todas" || i.categoria === categoria),
  );
}

/* ---------------- Dashboard ---------------- */

export function Dashboard() {
  const alertas = INSUMOS.filter((i) => estadoStock(i) !== "DISPONIBLE");

  return (
    <>
      <div className="mb-6 rounded-2xl bg-primary px-7 py-8 text-primary-foreground shadow-card">
        <p className="text-sm font-medium text-sand">Bienvenido de nuevo</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Hector Ramos</h2>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/70">
          Resumen del inventario del taller. Revisa las alertas de stock antes de iniciar las órdenes del día.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Insumos registrados", value: INSUMOS.length },
          { label: "Por acabarse", value: INSUMOS.filter((i) => estadoStock(i) === "POR ACABARSE").length },
          { label: "Sin existencia", value: INSUMOS.filter((i) => estadoStock(i) === "SIN EXISTENCIA").length },
        ].map((k) => (
          <Card key={k.label} className="px-6 py-5">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Alertas de stock" subtitle="Insumos que requieren reabastecimiento" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Insumo</Th>
                <Th>Existencia</Th>
                <Th>Mínimo</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((i) => (
                <tr key={i.id} className={rowHover}>
                  <Td className="font-medium">{i.nombre}</Td>
                  <Td className="tabular-nums">
                    {i.existencia} {i.unidad}
                  </Td>
                  <Td className="tabular-nums text-muted-foreground">
                    {i.minimo} {i.unidad}
                  </Td>
                  <Td>
                    <Badge tone={estadoStock(i) === "SIN EXISTENCIA" ? "danger" : "warning"}>{estadoStock(i)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ---------------- Reabastecer ---------------- */

export function Reabastecer() {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [minimos, setMinimos] = useState<Record<string, number>>(() =>
    Object.fromEntries(INSUMOS.map((i) => [i.id, i.minimo])),
  );
  const total = Object.values(cantidades).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageTitle title="Reabastecer insumos" subtitle="Indica la cantidad que ingresa al almacén del taller." />

      <div className="grid gap-4 pb-28 sm:grid-cols-2 xl:grid-cols-3">
        {INSUMOS.map((i) => (
          <Card key={i.id} className="overflow-hidden transition-shadow hover:shadow-lg">
            <img src={i.imagen} alt={i.nombre} loading="lazy" width={816} height={816} className="h-40 w-full bg-secondary object-cover" />
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    En almacén: {i.existencia} {i.unidad}
                  </p>
                </div>
                <Badge tone={estadoStock(i) === "DISPONIBLE" ? "success" : estadoStock(i) === "SIN EXISTENCIA" ? "danger" : "warning"}>
                  {estadoStock(i)}
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">A ingresar</span>
                <Stepper
                  value={cantidades[i.id] ?? 0}
                  onChange={(next) => setCantidades((prev) => ({ ...prev, [i.id]: next }))}
                />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2">
                <label
                  htmlFor={`min-${i.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Bell className="h-3.5 w-3.5" /> Límite de alerta
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id={`min-${i.id}`}
                    type="number"
                    min={0}
                    value={minimos[i.id] ?? i.minimo}
                    onChange={(e) =>
                      setMinimos((prev) => ({
                        ...prev,
                        [i.id]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="w-16 rounded-lg border border-border bg-card px-2 py-1 text-center text-sm font-semibold tabular-nums text-foreground outline-none transition-colors focus:border-sand"
                  />
                  <span className="text-xs text-muted-foreground">{i.unidad}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/95 px-6 py-4 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Total de piezas a ingresar: <span className="font-semibold tabular-nums text-foreground">{total}</span>
          </p>
          <div className="flex gap-3">
            <Pill variant="ghost" onClick={() => setCantidades({})}>
              Cancelar
            </Pill>
            <Pill variant="primary" onClick={() => setCantidades({})}>
              <PackagePlus className="h-4 w-4" /> Guardar
            </Pill>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Entregar ---------------- */

export function Entregar() {
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [trabajador, setTrabajador] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [notas, setNotas] = useState("");
  const items = useMemo(
    () => INSUMOS.filter((i) => (carrito[i.id] ?? 0) > 0).map((i) => ({ insumo: i, cant: carrito[i.id] })),
    [carrito],
  );
  const add = (i: Insumo, delta: number) =>
    setCarrito((prev) => ({ ...prev, [i.id]: Math.max(0, (prev[i.id] ?? 0) + delta) }));

  return (
    <>
      <PageTitle title="Entregar insumos" subtitle="Registra el retiro de material solicitado por los trabajadores." />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Catálogo de insumos" subtitle="Añade al carrito de entrega" />
          <ul>
            {INSUMOS.map((i) => (
              <li key={i.id} className="flex items-center gap-4 border-t border-border/70 px-5 py-3 transition-colors hover:bg-secondary/70">
                <img src={i.imagen} alt="" loading="lazy" width={816} height={816} className="h-12 w-12 rounded-lg bg-secondary object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Disponible: {i.existencia} {i.unidad}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => add(i, 1)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sand px-4 py-2 text-xs font-semibold text-sand-foreground transition-colors hover:bg-sand/80"
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Carrito de entrega" subtitle={`${items.length} insumo(s) seleccionados`} />
          <div className="px-5 py-4">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no has añadido insumos.</p>
            ) : (
              <ul className="space-y-3">
                {items.map(({ insumo, cant }) => (
                  <li key={insumo.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{insumo.nombre}</p>
                      <p className="text-xs text-muted-foreground">{insumo.unidad}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => add(insumo, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-sand"
                        aria-label="Restar"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{cant}</span>
                      <button
                        type="button"
                        onClick={() => add(insumo, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-sand"
                        aria-label="Sumar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCarrito((p) => ({ ...p, [insumo.id]: 0 }))}
                        className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-danger hover:text-danger-foreground"
                        aria-label="Quitar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 space-y-3 border-t border-border/70 pt-5">
              <div>
                <label
                  htmlFor="trabajador"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <UserRound className="h-3.5 w-3.5" /> Trabajador que recibe
                </label>
                <input
                  id="trabajador"
                  type="text"
                  value={trabajador}
                  onChange={(e) => setTrabajador(e.target.value)}
                  placeholder="Ej. Javier Ortega"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
              </div>
              <div>
                <label
                  htmlFor="vehiculo"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <Car className="h-3.5 w-3.5" /> Vehículo / Proyecto
                </label>
                <input
                  id="vehiculo"
                  type="text"
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Ej. Versa 2017"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
              </div>
              <div>
                <label
                  htmlFor="notas"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <NotebookPen className="h-3.5 w-3.5" /> Notas de entrega{" "}
                  <span className="font-normal normal-case text-muted-foreground/70">(opcional)</span>
                </label>
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Observaciones adicionales…"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
              </div>
            </div>

            <Pill
              variant="primary"
              className="mt-5 w-full"
              onClick={() => {
                setCarrito({});
                setTrabajador("");
                setVehiculo("");
                setNotas("");
              }}
            >
              <ShoppingCart className="h-4 w-4" /> Registrar retiro
            </Pill>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Usuarios ---------------- */

export function Usuarios() {
  return (
    <>
      <PageTitle
        title="Usuarios"
        subtitle="Cuentas con acceso al punto de entrega."
        action={
          <Pill variant="primary">
            <UserPlus className="h-4 w-4" /> Crear usuario
          </Pill>
        }
      />
      <Card>
        <CardHeader title="Cuentas registradas" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Nombre</Th>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {USUARIOS.map((u) => (
                <tr key={u.id} className={rowHover}>
                  <Td className="font-medium">{u.nombre}</Td>
                  <Td className="text-muted-foreground">@{u.usuario}</Td>
                  <Td>{u.rol}</Td>
                  <Td>
                    <Badge tone={u.activo ? "success" : "muted"}>{u.activo ? "ACTIVO" : "INACTIVO"}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ---------------- Reportes ---------------- */

export function Reportes() {
  const tone = (a: string): "success" | "danger" | "muted" =>
    a === "ENTRADA" ? "success" : a === "SALIDA" ? "danger" : "muted";

  const bajos = INSUMOS.filter((i) => estadoStock(i) !== "DISPONIBLE");

  const exportarListaCompras = () => {
    const filas = [
      ["Insumo", "Categoría", "Existencia", "Límite de alerta", "Unidad", "Estado"],
      ...bajos.map((i) => [i.nombre, i.categoria, String(i.existencia), String(i.minimo), i.unidad, estadoStock(i)]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${c}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lista-de-compras-picasso.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageTitle
        title="Reportes y auditoría"
        subtitle="Historial de movimientos y reportes de reabastecimiento."
      />

      <Card className="mb-6 border-success/40">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Generar lista de compras</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Exporta exclusivamente los insumos que alcanzaron su límite de alerta ({bajos.length} actualmente).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={exportarListaCompras}
            className="inline-flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-4 w-4" /> Exportar insumos bajos
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Bitácora de actividades"
          subtitle="Movimientos recientes del inventario."
          action={
            <Pill variant="sand">
              <Download className="h-4 w-4" /> Exportar reporte
            </Pill>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {BITACORA.map((m) => (
                <tr key={m.id} className={rowHover}>
                  <Td className="whitespace-nowrap text-muted-foreground">{m.fecha}</Td>
                  <Td className="font-medium">@{m.usuario}</Td>
                  <Td>
                    <Badge tone={tone(m.accion)}>{m.accion}</Badge>
                  </Td>
                  <Td>{m.detalle}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
