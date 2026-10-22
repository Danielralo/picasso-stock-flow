import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Ban,
  BellRing,
  Car,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  NotebookPen,
  PackagePlus,
  PackageSearch,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UserPlus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BITACORA, CATEGORIAS, INSUMOS, ROLES, USUARIOS, type Usuario, estadoStock, type Insumo } from "@/lib/picasso-data";
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
          placeholder="Buscar por código o nombre…"
          aria-label="Buscar insumo por código o nombre"
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
  if (categoria === "") return [];
  const q = busqueda.trim().toLowerCase();
  return INSUMOS.filter(
    (i) =>
      (i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)) &&
      (categoria === "Todas" || i.categoria === categoria),
  );
}

const POR_PAGINA = 10;

function EstadoVacio() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <PackageSearch className="h-7 w-7" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">Selecciona una categoría para ver los insumos</p>
      <p className="mt-1 text-xs text-muted-foreground">Usa los filtros de arriba para cargar el inventario.</p>
    </div>
  );
}

function Paginacion({ pagina, totalPaginas, onChange }: { pagina: number; totalPaginas: number; onChange: (p: number) => void }) {
  if (totalPaginas <= 1) return null;
  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40";
  return (
    <nav className="mt-5 flex items-center justify-center gap-2" aria-label="Paginación de insumos">
      <button type="button" className={btn} onClick={() => onChange(pagina - 1)} disabled={pagina <= 1} aria-label="Página anterior">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: totalPaginas }, (_, idx) => idx + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === pagina ? "page" : undefined}
          className={p === pagina ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-2 text-sm font-semibold text-primary-foreground" : btn}
        >
          {p}
        </button>
      ))}
      <button type="button" className={btn} onClick={() => onChange(pagina + 1)} disabled={pagina >= totalPaginas} aria-label="Página siguiente">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

function usePagina<T>(items: T[]): { pagina: number; setPagina: (p: number) => void; visibles: T[]; totalPaginas: number } {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(items.length / POR_PAGINA));
  const actual = Math.min(pagina, totalPaginas);
  const visibles = items.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
  return { pagina: actual, setPagina, visibles, totalPaginas };
}

/* ---------------- Dashboard ---------------- */

export function Dashboard({ nombre = "Hector Ramos", rol = "Administrador", onVerAlertas }: { nombre?: string; rol?: string; onVerAlertas: () => void }) {
  return (
    <>
      <div className="mb-6 rounded-2xl bg-primary px-7 py-8 text-primary-foreground shadow-card">
        <p className="text-sm font-medium text-sand">Bienvenido de nuevo · {rol}</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">{nombre}</h2>
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

      <div className="flex justify-center sm:justify-start">
        <Pill variant="primary" onClick={onVerAlertas}>
          <BellRing className="h-4 w-4" /> Ver todas las alertas
        </Pill>
      </div>
    </>
  );
}

/* ---------------- Alertas de stock ---------------- */

export function Alertas() {
  const alertas = INSUMOS.filter((i) => estadoStock(i) !== "DISPONIBLE");

  return (
    <>
      <PageTitle title="Alertas de stock" subtitle="Insumos que requieren reabastecimiento urgente." />
      <Card>
        <CardHeader title="Insumos bajos o agotados" subtitle={`${alertas.length} insumo(s) por debajo de su nivel esperado`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Insumo</Th>
                <Th>Categoría</Th>
                <Th>Existencia</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((i) => (
                <tr key={i.id} className={rowHover}>
                  <Td>
                    <p className="font-mono text-sm font-bold tracking-wide text-foreground">{i.codigo}</p>
                    <p className="text-xs text-muted-foreground">{i.nombre}</p>
                  </Td>
                  <Td className="text-muted-foreground">{i.categoria}</Td>
                  <Td className="tabular-nums">
                    {i.existencia} {i.unidad}
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
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const filtrados = filtrarInsumos(busqueda, categoria);
  const { pagina, setPagina, visibles, totalPaginas } = usePagina(filtrados);
  const total = Object.values(cantidades).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageTitle title="Reabastecer insumos" subtitle="Indica la cantidad que ingresa al almacén del taller." />

      <BuscadorInsumos
        busqueda={busqueda}
        setBusqueda={(v) => {
          setBusqueda(v);
          setPagina(1);
        }}
        categoria={categoria}
        setCategoria={(v) => {
          setCategoria(v);
          setPagina(1);
        }}
      />

      {categoria === "" ? (
        <EstadoVacio />
      ) : filtrados.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          No se encontraron insumos con ese criterio.
        </p>
      ) : (
        <>
        <div className="grid gap-4 pb-28 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((i) => (
          <Card key={i.id} className="overflow-hidden transition-shadow hover:shadow-lg">
            <img src={i.imagen} alt={i.nombre} loading="lazy" width={816} height={816} className="h-40 w-full bg-secondary object-cover" />
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-lg font-bold tracking-wide text-foreground">{i.codigo}</p>
                  <p className="text-sm text-muted-foreground">{i.nombre}</p>
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
            </div>
          </Card>
            ))}
        </div>
      )}

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
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const catalogo = filtrarInsumos(busqueda, categoria);
  const items = useMemo(
    () => INSUMOS.filter((i) => (carrito[i.id] ?? 0) > 0).map((i) => ({ insumo: i, cant: carrito[i.id]! })),
    [carrito],
  );
  const add = (i: Insumo, delta: number) =>
    setCarrito((prev) => ({ ...prev, [i.id]: Math.round(Math.max(0, (prev[i.id] ?? 0) + delta) * 100) / 100 }));
  const [intentado, setIntentado] = useState(false);
  const faltaTrabajador = trabajador.trim() === "";
  const faltaVehiculo = vehiculo.trim() === "";
  const puedeRegistrar = items.length > 0 && !faltaTrabajador && !faltaVehiculo;
  const notaSalida = `Entregado a: ${trabajador.trim() || "—"} | Vehículo/Color: ${vehiculo.trim() || "—"}${notas.trim() ? ` | Nota: ${notas.trim()}` : ""}`;
  const registrar = () => {
    setIntentado(true);
    if (!puedeRegistrar) return;
    const nota = `Entregado a: ${trabajador.trim()} | Vehículo/Color: ${vehiculo.trim()}${notas.trim() ? ` | Nota: ${notas.trim()}` : ""}`;
    console.info("Registro de salida →", { nota, items: items.map((x) => ({ id: x.insumo.id, cantidad: x.cant })) });
    toast.success("Retiro registrado", { description: nota });
    setCarrito({});
    setTrabajador("");
    setVehiculo("");
    setNotas("");
    setIntentado(false);
  };

  return (
    <>
      <PageTitle title="Entregar insumos" subtitle="Registra el retiro de material solicitado por los trabajadores." />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Catálogo de insumos" subtitle="Añade al carrito de entrega" />
          <div className="border-t border-border/70 px-5 py-4">
            <BuscadorInsumos
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              categoria={categoria}
              setCategoria={setCategoria}
            />
            {catalogo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron insumos con ese criterio.
              </p>
            ) : (
              <ul className="-mx-2">
                {catalogo.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/70">
                    <img src={i.imagen} alt="" loading="lazy" width={816} height={816} className="h-12 w-12 rounded-lg bg-secondary object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-base font-bold tracking-wide text-foreground">{i.codigo}</p>
                      <p className="truncate text-sm text-muted-foreground">{i.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.categoria} · Disponible: {i.existencia} {i.unidad}
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
            )}
          </div>
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
                      <p className="font-mono text-sm font-bold tracking-wide text-foreground">{insumo.codigo}</p>
                      <p className="truncate text-xs text-muted-foreground">{insumo.nombre} · {insumo.unidad}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Stepper
                        value={cant}
                        label={`Cantidad de ${insumo.nombre}`}
                        onChange={(n) => setCarrito((p) => ({ ...p, [insumo.id]: n }))}
                      />
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
                  <UserRound className="h-3.5 w-3.5" /> Trabajador <span className="text-danger">*</span>
                </label>
                <input
                  id="trabajador"
                  type="text"
                  value={trabajador}
                  onChange={(e) => setTrabajador(e.target.value)}
                  placeholder="Ej. Javier Ortega"
                  required
                  aria-invalid={intentado && faltaTrabajador}
                  className="w-full rounded-xl border border-border aria-[invalid=true]:border-danger bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
                {intentado && faltaTrabajador && <p className="mt-1 text-xs text-danger">Indica quién recibe el material.</p>}
              </div>
              <div>
                <label
                  htmlFor="vehiculo"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <Car className="h-3.5 w-3.5" /> Vehículo / Color <span className="text-danger">*</span>
                </label>
                <input
                  id="vehiculo"
                  type="text"
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Ej. Versa 2017 · Rojo"
                  required
                  aria-invalid={intentado && faltaVehiculo}
                  className="w-full rounded-xl border border-border aria-[invalid=true]:border-danger bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
                {intentado && faltaVehiculo && <p className="mt-1 text-xs text-danger">Indica el vehículo o proyecto.</p>}
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

            <div className="mt-4 rounded-xl border border-dashed border-border bg-secondary/50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nota de salida que se guardará</p>
              <p className="mt-1 break-words font-mono text-xs text-foreground">{notaSalida}</p>
            </div>

            <Pill
              variant="primary"
              className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!puedeRegistrar}
              onClick={registrar}
            >
              <ShoppingCart className="h-4 w-4" /> Registrar retiro
            </Pill>
            {!puedeRegistrar && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {items.length === 0 ? "Añade al menos un insumo al carrito." : "Completa trabajador y vehículo/color para registrar."}
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ---------------- Usuarios ---------------- */

export function Usuarios() {
  const [cuentas, setCuentas] = useState<Usuario[]>(USUARIOS);
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: "", usuario: "", rol: "Encargado" as Usuario["rol"] });
  const valido = nuevo.nombre.trim().length > 1 && /^[a-z0-9._]{3,20}$/.test(nuevo.usuario.trim());
  const crear = () => {
    if (!valido) return;
    setCuentas((p) => [...p, { id: String(Date.now()), nombre: nuevo.nombre.trim(), usuario: nuevo.usuario.trim(), rol: nuevo.rol, activo: true }]);
    toast.success("Usuario creado", { description: `${nuevo.nombre.trim()} · ${nuevo.rol}` });
    setNuevo({ nombre: "", usuario: "", rol: "Encargado" });
    setAbierto(false);
  };
  const campo = "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand";

  const cambiarEstado = (id: string) =>
    setCuentas((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));

  return (
    <>
      <PageTitle
        title="Usuarios"
        subtitle="Cuentas con acceso al punto de entrega."
        action={
          <Pill variant="primary" onClick={() => setAbierto(true)}>
            <UserPlus className="h-4 w-4" /> Crear usuario
          </Pill>
        }
      />
      <Card>
        <CardHeader title="Cuentas registradas" subtitle="Usa el botón de opciones para dar de baja o reactivar una cuenta." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Nombre</Th>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th className="text-right">Opciones</Th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((u) => (
                <tr key={u.id} className={rowHover}>
                  <Td className="font-medium">{u.nombre}</Td>
                  <Td className="text-muted-foreground">@{u.usuario}</Td>
                  <Td>{u.rol}</Td>
                  <Td>
                    <Badge tone={u.activo ? "success" : "muted"}>{u.activo ? "ACTIVO" : "INACTIVO"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => cambiarEstado(u.id)}
                      title={u.activo ? "Dar de baja" : "Reactivar cuenta"}
                      aria-label={u.activo ? `Dar de baja a ${u.nombre}` : `Reactivar cuenta de ${u.nombre}`}
                      className={
                        u.activo
                          ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-danger hover:text-danger-foreground"
                          : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-sand hover:text-sand-foreground"
                      }
                    >
                      {u.activo ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Solo administradores y encargados tienen acceso al sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="nu-nombre" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre completo</label>
              <input id="nu-nombre" maxLength={80} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej. Lucía Márquez" className={campo} />
            </div>
            <div>
              <label htmlFor="nu-usuario" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuario</label>
              <input id="nu-usuario" maxLength={20} value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase() })} placeholder="Ej. lmarquez" className={campo} />
            </div>
            <div>
              <label htmlFor="nu-rol" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol / Permisos</label>
              <select id="nu-rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Usuario["rol"] })} className={campo}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r === "Administrador" ? "Administrador (Dueño)" : r}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Pill variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Pill>
            <Pill variant="primary" onClick={crear} disabled={!valido} className="disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Crear usuario
            </Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      ["Código", "Insumo", "Categoría", "Existencia", "Unidad", "Estado"],
      ...bajos.map((i) => [i.codigo, i.nombre, i.categoria, String(i.existencia), i.unidad, estadoStock(i)]),
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
                Exporta exclusivamente los insumos con stock bajo o sin existencia ({bajos.length} actualmente).
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
