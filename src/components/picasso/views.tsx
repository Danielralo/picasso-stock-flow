import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Ban,
  BellRing,
  Car,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  Download,
  FileSpreadsheet,
  KeyRound,
  NotebookPen,
  PackagePlus,
  PackageSearch,
  PackageX,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UserPlus,
  UserX,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORIAS, EMAIL_VALIDO, ROLES, USUARIO_VALIDO, estadoStock, formatoFecha, type Insumo, type Usuario } from "@/lib/picasso-data";
import {
  cambiarEstadoUsuario,
  crearUsuario,
  darDeBajaInsumo,
  editarUsuario,
  eliminarUsuario,
  obtenerBitacora,
  obtenerCatalogos,
  obtenerConsumo,
  obtenerInsumos,
  obtenerListaCompras,
  obtenerUsuarios,
  registrarSalida,
  useDatos,
} from "@/lib/api";
import { construirPayloadTicket, enviarTicketReabastecimiento } from "@/lib/reabastecimiento-api";
import { usePagina } from "@/lib/paginacion";
import { crearListaCompras, crearReporteExcel, type FilaCompra } from "@/lib/excel-lista-compras";
import { InsumoDialog, NuevoInsumoDialog } from "./NuevoInsumoDialog";
import { Badge, Card, CardHeader, PageTitle, Pill, Stepper, Td, Th } from "./ui-bits";

const rowHover = "border-t border-border/70 transition-colors hover:bg-secondary/70";

/** Descarga un archivo generado en el navegador (los reportes de Excel). */
function descargarArchivo(nombre: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/** Cuadro de confirmación para acciones que no se pueden deshacer. */
function Confirmar({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  textoBoton,
  onConfirmar,
}: {
  abierto: boolean;
  onAbiertoChange: (v: boolean) => void;
  titulo: string;
  descripcion: string;
  textoBoton: string;
  onConfirmar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Pill variant="ghost" onClick={() => onAbiertoChange(false)}>Cancelar</Pill>
          <Pill variant="primary" className="bg-danger text-danger-foreground hover:bg-danger/90" onClick={onConfirmar}>
            {textoBoton}
          </Pill>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

function filtrarInsumos(lista: Insumo[], busqueda: string, categoria: string): Insumo[] {
  if (categoria === "") return [];
  const q = busqueda.trim().toLowerCase();
  return lista.filter(
    (i) =>
      (i.nombre.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q)) &&
      (categoria === "Todas" || i.categoria === categoria),
  );
}

/** Mensaje mientras llegan los datos del servidor, o el error si no se pudieron cargar. */
function EstadoCarga({ cargando, error, onReintentar }: { cargando: boolean; error: string | null; onReintentar: () => void }) {
  if (error) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium text-destructive">{error}</p>
        <Pill variant="ghost" className="mt-4" onClick={onReintentar}>Reintentar</Pill>
      </div>
    );
  }
  if (cargando) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos…
      </p>
    );
  }
  return null;
}

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

function Paginacion({ pagina, totalPaginas, total, onChange }: { pagina: number; totalPaginas: number; total: number; onChange: (p: number) => void }) {
  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border bg-card px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40";
  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Paginación de insumos">
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
      <span className="ml-2 text-xs font-medium text-muted-foreground">
        Página {pagina} de {totalPaginas} · {total} insumo{total === 1 ? "" : "s"}
      </span>
    </nav>
  );
}

/* ---------------- Dashboard ---------------- */

export function Dashboard({ nombre = "Hector Ramos", rol = "Administrador", onVerAlertas }: { nombre?: string; rol?: string; onVerAlertas: () => void }) {
  const { datos } = useDatos(obtenerInsumos);
  const insumos = datos ?? [];
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
          { label: "Insumos registrados", value: datos ? insumos.length : "…" },
          { label: "Por acabarse", value: datos ? insumos.filter((i) => estadoStock(i) === "POR ACABARSE").length : "…" },
          { label: "Sin existencia", value: datos ? insumos.filter((i) => estadoStock(i) === "SIN EXISTENCIA").length : "…" },
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
  const { datos, cargando, error, recargar } = useDatos(obtenerInsumos);
  const alertas = (datos ?? []).filter((i) => estadoStock(i) !== "DISPONIBLE");
  if (!datos) return <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />;

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
              {alertas.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">Ningún insumo está por debajo de su stock mínimo.</td></tr>
              )}
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
  const { datos, cargando, error, recargar } = useDatos(obtenerInsumos);
  // Los catálogos se recargan después de guardar un insumo por si se registró una marca nueva (RF-01, excepción 3b)
  const { datos: catalogos, recargar: recargarCatalogos } = useDatos(obtenerCatalogos);
  const insumos = datos ?? [];
  const codigos = insumos.map((i) => i.codigo);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editar, setEditar] = useState<Insumo | null>(null);
  const [baja, setBaja] = useState<Insumo | null>(null);

  // RF-04: el servidor solo lo quita del catálogo si no tiene salidas registradas (se conserva el historial).
  const darDeBaja = async (i: Insumo) => {
    setBaja(null);
    try {
      await darDeBajaInsumo(i.codigo);
      toast.success("Insumo dado de baja", { description: `${i.codigo} · ${i.nombre}` });
      void recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo dar de baja el insumo");
    }
  };
  const filtrados = filtrarInsumos(insumos, busqueda, categoria);
  const { pagina, setPagina, visibles, totalPaginas } = usePagina(filtrados);
  const total = Object.values(cantidades).reduce((a, b) => a + b, 0);

  const guardar = async () => {
    const detalles = construirPayloadTicket(cantidades); // [{ id_insumo, cantidad_agregada }]
    if (detalles.length === 0) {
      toast.error("Indica al menos una cantidad mayor a 0");
      return;
    }
    setGuardando(true);
    try {
      // El servidor suma las cantidades a stockActual, recalcula las alertas y registra la ENTRADA en la bitácora.
      const res = await enviarTicketReabastecimiento(detalles);
      toast.success(`Ticket #${res.id_ticket} registrado`, { description: `${detalles.length} insumo(s) reabastecido(s)` });
      setCantidades({});
      void recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar el ticket");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Reabastecer insumos"
        subtitle="Indica la cantidad que ingresa al almacén del taller."
        action={
          <NuevoInsumoDialog catalogos={catalogos} codigosExistentes={codigos} onCreado={() => { void recargar(); void recargarCatalogos(); }} />
        }
      />

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

      {!datos ? (
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />
      ) : categoria === "" ? (
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
                    {i.marca} · En almacén: {i.existencia} {i.unidad}
                  </p>
                </div>
                <Badge tone={estadoStock(i) === "DISPONIBLE" ? "success" : estadoStock(i) === "SIN EXISTENCIA" ? "danger" : "warning"}>
                  {estadoStock(i)}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditar(i)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  type="button"
                  onClick={() => setBaja(i)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-danger hover:text-danger-foreground"
                >
                  <PackageX className="h-3.5 w-3.5" /> Dar de baja
                </button>
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
        <div className="pb-28">
          <Paginacion pagina={pagina} totalPaginas={totalPaginas} total={filtrados.length} onChange={setPagina} />
        </div>
        </>
      )}

      {editar && (
        <InsumoDialog
          abierto
          onAbiertoChange={(v) => !v && setEditar(null)}
          insumo={editar}
          catalogos={catalogos}
          codigosExistentes={codigos}
          onGuardado={() => { void recargar(); void recargarCatalogos(); }}
        />
      )}
      <Confirmar
        abierto={!!baja}
        onAbiertoChange={(v) => !v && setBaja(null)}
        titulo="¿Dar de baja este insumo?"
        descripcion={baja ? `${baja.codigo} · ${baja.nombre} ya no aparecerá en Reabastecer ni en Entregar.` : ""}
        textoBoton="Dar de baja"
        onConfirmar={() => baja && void darDeBaja(baja)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/95 px-6 py-4 backdrop-blur lg:left-72">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Total de piezas a ingresar: <span className="font-semibold tabular-nums text-foreground">{total}</span>
          </p>
          <div className="flex gap-3">
            <Pill variant="ghost" onClick={() => setCantidades({})} disabled={guardando}>
              Cancelar
            </Pill>
            <Pill variant="primary" onClick={guardar} disabled={guardando}>
              <PackagePlus className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar"}
            </Pill>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Entregar ---------------- */

export function Entregar() {
  const { datos, cargando, error, recargar } = useDatos(obtenerInsumos);
  const insumos = datos ?? [];
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [trabajador, setTrabajador] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [notas, setNotas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const catalogo = filtrarInsumos(insumos, busqueda, categoria);
  const { pagina, setPagina, visibles, totalPaginas } = usePagina(catalogo);
  const items = useMemo(
    () => insumos.filter((i) => (carrito[i.id] ?? 0) > 0).map((i) => ({ insumo: i, cant: carrito[i.id]! })),
    [carrito, insumos],
  );
  /** RF-08: la cantidad acepta decimales, pero nunca puede ser mayor que la existencia. */
  const fijarCantidad = (i: Insumo, n: number) => {
    let cant = Math.round(Math.max(0, n) * 100) / 100;
    if (cant > i.existencia) {
      toast.error("No hay suficiente material", { description: `${i.codigo}: solo hay ${i.existencia} ${i.unidad} disponibles.` });
      cant = i.existencia;
    }
    setCarrito((prev) => ({ ...prev, [i.id]: cant }));
  };
  const add = (i: Insumo, delta: number) => {
    if (i.existencia === 0) return;
    fijarCantidad(i, (carrito[i.id] ?? 0) + delta);
  };
  const [intentado, setIntentado] = useState(false);
  const faltaTrabajador = trabajador.trim() === "";
  const faltaVehiculo = vehiculo.trim() === "";
  const puedeRegistrar = items.length > 0 && !faltaTrabajador && !faltaVehiculo;
  const notaSalida = `Entregado a: ${trabajador.trim() || "—"} | Vehículo/Color: ${vehiculo.trim() || "—"}${notas.trim() ? ` | Nota: ${notas.trim()}` : ""}`;
  const [registrando, setRegistrando] = useState(false);
  const registrar = async () => {
    setIntentado(true);
    if (!puedeRegistrar) return;
    setRegistrando(true);
    try {
      // RF-10: el servidor descuenta, guarda la salida y la bitácora; si algo no alcanza no descuenta nada (4a).
      const res = await registrarSalida({
        trabajadorDestino: trabajador.trim(),
        vehiculo: vehiculo.trim(),
        notas: notas.trim(),
        insumos: items.map(({ insumo, cant }) => ({ idInsumo: insumo.id, cantidad: cant })),
      });
      toast.success("Retiro registrado", { description: res.detalle });
    } catch (e) {
      toast.error("No se registró el retiro", { description: e instanceof Error ? e.message : "" });
      void recargar();
      return;
    } finally {
      setRegistrando(false);
    }
    setCarrito({});
    setTrabajador("");
    setVehiculo("");
    setNotas("");
    setIntentado(false);
    void recargar();
  };

  return (
    <>
      <PageTitle title="Entregar insumos" subtitle="Registra el retiro de material solicitado por los trabajadores." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Catálogo de insumos" subtitle="Añade al carrito de entrega" />
          <div className="border-t border-border/70 px-5 py-4">
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
            {!datos ? (
              <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />
            ) : categoria === "" ? (
              <EstadoVacio />
            ) : catalogo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No se encontraron insumos con ese criterio.
              </p>
            ) : (
              <>
              <ul className="-mx-2">
                {visibles.map((i) => {
                  const agotado = i.existencia === 0;
                  return (
                  <li key={i.id} className={agotado ? "flex items-center gap-4 rounded-xl px-2 py-3 opacity-50" : "flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/70"}>
                    <img src={i.imagen} alt="" loading="lazy" width={816} height={816} className="h-12 w-12 rounded-lg bg-secondary object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-base font-bold tracking-wide text-foreground">{i.codigo}</p>
                      <p className="truncate text-sm text-muted-foreground">{i.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.categoria} · Disponible: {i.existencia} {i.unidad}
                      </p>
                    </div>
                    {agotado ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full bg-sand px-4 py-2 text-xs font-semibold text-sand-foreground opacity-60">
                              <Plus className="h-3.5 w-3.5" /> Añadir
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>No se puede entregar: Sin existencia</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <button
                        type="button"
                        onClick={() => add(i, 1)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sand px-4 py-2 text-xs font-semibold text-sand-foreground transition-colors hover:bg-sand/80"
                      >
                        <Plus className="h-3.5 w-3.5" /> Añadir
                      </button>
                    )}
                  </li>
                  );
                })}
              </ul>
              <Paginacion pagina={pagina} totalPaginas={totalPaginas} total={catalogo.length} onChange={setPagina} />
              </>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="Carrito de entrega"
            subtitle={`${items.length} insumo(s) seleccionados`}
            action={
              items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCarrito({})}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-danger hover:text-danger-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Vaciar carrito
                </button>
              ) : null
            }
          />
          <div className="px-5 py-4">
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Aún no has añadido insumos.</p>
            ) : (
              <ul className="space-y-3">
                {items.map(({ insumo, cant }) => (
                  <li key={insumo.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
                    <div className="min-w-[8rem] flex-1">
                      <p className="font-mono text-sm font-bold tracking-wide text-foreground">{insumo.codigo}</p>
                      <p className="truncate text-xs text-muted-foreground">{insumo.nombre} · {insumo.unidad}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Stepper
                        value={cant}
                        label={`Cantidad de ${insumo.nombre}`}
                        onChange={(n) => fijarCantidad(insumo, n)}
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
                  <UserRound className="h-3.5 w-3.5" /> Trabajador <span className="text-destructive">*</span>
                </label>
                <input
                  id="trabajador"
                  type="text"
                  value={trabajador}
                  onChange={(e) => setTrabajador(e.target.value)}
                  placeholder="Ej. Javier Ortega"
                  required
                  aria-invalid={intentado && faltaTrabajador}
                  className="w-full rounded-xl border border-border aria-[invalid=true]:border-destructive bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
                {intentado && faltaTrabajador && <p className="mt-1 text-xs text-destructive">Indica quién recibe el material.</p>}
              </div>
              <div>
                <label
                  htmlFor="vehiculo"
                  className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <Car className="h-3.5 w-3.5" /> Vehículo / Color <span className="text-destructive">*</span>
                </label>
                <input
                  id="vehiculo"
                  type="text"
                  value={vehiculo}
                  onChange={(e) => setVehiculo(e.target.value)}
                  placeholder="Ej. Versa 2017 · Rojo"
                  required
                  aria-invalid={intentado && faltaVehiculo}
                  className="w-full rounded-xl border border-border aria-[invalid=true]:border-destructive bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand"
                />
                {intentado && faltaVehiculo && <p className="mt-1 text-xs text-destructive">Indica el vehículo o proyecto.</p>}
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
              disabled={!puedeRegistrar || registrando}
              onClick={() => void registrar()}
            >
              <ShoppingCart className="h-4 w-4" /> {registrando ? "Registrando…" : "Registrar retiro"}
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

const campoCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand aria-[invalid=true]:border-danger";

function Campo({ id, label, children, error }: { id: string; label: string; children: React.ReactNode; error?: string | undefined }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const btnOpcion =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors";

export function Usuarios() {
  const { datos, cargando, error, recargar } = useDatos(obtenerUsuarios);
  const cuentas = datos?.usuarios ?? [];
  const solicitudes = datos?.solicitudes ?? [];

  /** Ejecuta una acción en el servidor, muestra el resultado y vuelve a cargar la tabla. */
  const ejecutar = async (accion: () => Promise<unknown>, exito: string, detalle: string, tituloError: string) => {
    try {
      await accion();
      toast.success(exito, { description: detalle });
      void recargar();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tituloError);
      return false;
    }
  };

  /* RNF-04 Alta de accesos */
  const VACIO = { nombre: "", usuario: "", email: "", password: "", rol: "Encargado" as Usuario["rol"] };
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(VACIO);
  const [errorUsuario, setErrorUsuario] = useState("");
  const valido =
    nuevo.nombre.trim().length > 1 &&
    USUARIO_VALIDO.test(nuevo.usuario.trim()) &&
    EMAIL_VALIDO.test(nuevo.email.trim()) &&
    nuevo.password.length >= 6;
  const crear = async () => {
    if (!valido) return;
    try {
      await crearUsuario({
        nombreCompleto: nuevo.nombre.trim(),
        username: nuevo.usuario.trim(),
        emailUsuario: nuevo.email.trim(),
        password: nuevo.password,
        rolUsuario: nuevo.rol,
      });
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "";
      if (mensaje.includes("usuario ya existe")) setErrorUsuario(mensaje); // excepción 4a
      else toast.error("No se creó el usuario", { description: mensaje });
      return;
    }
    toast.success("Usuario creado", { description: `${nuevo.nombre.trim()} · ${nuevo.rol}` });
    setNuevo(VACIO);
    setAbierto(false);
    void recargar();
  };

  /* RNF-06 Edición de accesos (también atiende las solicitudes de RNF-09) */
  const [editar, setEditar] = useState<Usuario | null>(null);
  const [ed, setEd] = useState({ nombre: "", email: "", rol: "Encargado" as Usuario["rol"], password: "" });
  const [errorEmail, setErrorEmail] = useState("");
  const abrirEditar = (u: Usuario) => {
    setEditar(u);
    setEd({ nombre: u.nombre, email: u.email, rol: u.rol, password: "" });
    setErrorEmail("");
  };
  const guardarEdicion = async () => {
    if (!editar) return;
    const email = ed.email.trim();
    if (!EMAIL_VALIDO.test(email)) {
      setErrorEmail("El correo no es válido o ya pertenece a otra cuenta.");
      return;
    }
    try {
      const r = await editarUsuario({
        idUsuario: editar.id,
        nombreCompleto: ed.nombre.trim() || editar.nombre,
        emailUsuario: email,
        rolUsuario: ed.rol,
        passwordNueva: ed.password,
      });
      toast.success("Cambios guardados", {
        description: r.cambioRol ? "El nuevo rol aplicará cuando el empleado vuelva a iniciar sesión." : `@${editar.usuario}`,
      });
      setEditar(null);
      void recargar();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "";
      if (mensaje.includes("correo")) setErrorEmail(mensaje); // excepción 4a
      else toast.error("No se guardaron los cambios", { description: mensaje });
    }
  };

  /* RNF-07 Baja de accesos (eliminar cuentas creadas por error) */
  const [eliminar, setEliminar] = useState<Usuario | null>(null);
  const confirmarEliminar = (u: Usuario) => {
    setEliminar(null);
    void ejecutar(() => eliminarUsuario(u.id), "Usuario eliminado", `@${u.usuario}`, "No se puede eliminar");
  };

  /* RNF-08 Bloqueo de cuentas */
  const cambiarEstado = (u: Usuario) => {
    void ejecutar(
      () => cambiarEstadoUsuario(u.id, !u.activo),
      u.activo ? "Cuenta dada de baja" : "Cuenta reactivada",
      `@${u.usuario}`,
      "No se puede dar de baja",
    );
  };

  /* RNF-05 Consulta de accesos */
  const [q, setQ] = useState("");
  const [fRol, setFRol] = useState<"Todos" | Usuario["rol"]>("Todos");
  const [fEstado, setFEstado] = useState<"Todos" | "Activo" | "Inactivo">("Todos");
  const texto = q.trim().toLowerCase();
  const filtradas = cuentas.filter(
    (u) =>
      (fRol === "Todos" || u.rol === fRol) &&
      (fEstado === "Todos" || u.activo === (fEstado === "Activo")) &&
      (!texto || u.nombre.toLowerCase().includes(texto) || u.usuario.toLowerCase().includes(texto)),
  );

  return (
    <>
      <PageTitle
        title="Usuarios"
        subtitle="Cuentas con acceso al sistema de inventario."
        action={
          <Pill variant="primary" onClick={() => setAbierto(true)}>
            <UserPlus className="h-4 w-4" /> Crear usuario
          </Pill>
        }
      />

      {solicitudes.length > 0 && (
        <Card className="mb-6 border-warning/60">
          <CardHeader title="Solicitudes de restablecimiento de clave" subtitle="Asigna una contraseña nueva y comunícasela al empleado (RNF-09)." />
          <ul className="divide-y divide-border/70">
            {solicitudes.map((s) => {
              const u = cuentas.find((x) => x.id === s.idUsuario);
              return (
                <li key={s.usuario + s.fecha} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm">
                  <span>
                    <span className="font-semibold">@{s.usuario}</span>
                    <span className="text-muted-foreground"> · {s.fecha}</span>
                  </span>
                  {u && (
                    <Pill variant="sand" onClick={() => abrirEditar(u)}>
                      <KeyRound className="h-4 w-4" /> Asignar contraseña
                    </Pill>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Cuentas registradas" subtitle="En «Opciones» puedes editar, dar de baja, reactivar o eliminar una cuenta." />
        <div className="flex flex-wrap items-center gap-3 px-6 pb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o usuario…"
            className="min-w-[200px] flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none focus:border-sand"
          />
          <div className="flex gap-1">
            {(["Todos", "Administrador", "Encargado"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setFRol(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${fRol === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {r === "Administrador" ? "Dueño" : r}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["Todos", "Activo", "Inactivo"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFEstado(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${fEstado === s ? "bg-sand text-sand-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {!datos && <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Nombre</Th>
                <Th>Usuario</Th>
                <Th>Correo</Th>
                <Th>Rol</Th>
                <Th>Estado</Th>
                <Th className="text-right">Opciones</Th>
              </tr>
            </thead>
            <tbody>
              {datos && filtradas.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">Ninguna cuenta coincide con los filtros.</td></tr>
              )}
              {filtradas.map((u) => (
                <tr key={u.id} className={rowHover}>
                  <Td className="font-medium">{u.nombre}</Td>
                  <Td className="text-muted-foreground">@{u.usuario}</Td>
                  <Td className="text-muted-foreground">{u.email}</Td>
                  <Td>{u.rol}</Td>
                  <Td>
                    <Badge tone={u.activo ? "success" : "muted"}>{u.activo ? "ACTIVO" : "INACTIVO"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1.5">
                      <button type="button" onClick={() => abrirEditar(u)} title="Editar" aria-label={`Editar a ${u.nombre}`}
                        className={`${btnOpcion} hover:bg-secondary hover:text-foreground`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cambiarEstado(u)}
                        title={u.activo ? "Dar de baja" : "Reactivar cuenta"}
                        aria-label={u.activo ? `Dar de baja a ${u.nombre}` : `Reactivar cuenta de ${u.nombre}`}
                        className={`${btnOpcion} ${u.activo ? "hover:bg-danger hover:text-danger-foreground" : "hover:bg-sand hover:text-sand-foreground"}`}
                      >
                        {u.activo ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => setEliminar(u)} title="Eliminar" aria-label={`Eliminar a ${u.nombre}`}
                        className={`${btnOpcion} hover:bg-danger hover:text-danger-foreground`}>
                        <UserX className="h-4 w-4" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={abierto} onOpenChange={(v) => { setAbierto(v); if (!v) { setNuevo(VACIO); setErrorUsuario(""); } }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Solo administradores y encargados tienen acceso al sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Campo id="nu-nombre" label="Nombre completo">
              <input id="nu-nombre" maxLength={100} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Ej. Lucía Márquez" className={campoCls} />
            </Campo>
            <Campo id="nu-usuario" label="Usuario" error={errorUsuario}>
              <input id="nu-usuario" maxLength={20} value={nuevo.usuario} aria-invalid={!!errorUsuario}
                onChange={(e) => { setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase() }); setErrorUsuario(""); }}
                placeholder="De 3 a 20: minúsculas, números, punto o guion bajo" className={campoCls} />
            </Campo>
            <Campo id="nu-email" label="Correo electrónico">
              <input id="nu-email" type="email" maxLength={100} value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} placeholder="Ej. lmarquez@picassoautosport.com" className={campoCls} />
            </Campo>
            <Campo id="nu-password" label="Contraseña">
              <input id="nu-password" type="password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} placeholder="Mínimo 6 caracteres" className={campoCls} />
            </Campo>
            <Campo id="nu-rol" label="Rol / Permisos">
              <select id="nu-rol" value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Usuario["rol"] })} className={campoCls}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r === "Administrador" ? "Administrador (Dueño)" : r}</option>
                ))}
              </select>
            </Campo>
          </div>
          <DialogFooter className="gap-2">
            <Pill variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Pill>
            <Pill variant="primary" onClick={() => void crear()} disabled={!valido} className="disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> Crear usuario
            </Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editar} onOpenChange={(v) => !v && setEditar(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>{editar ? `@${editar.usuario}. Deja la contraseña vacía para conservar la actual.` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Campo id="ed-nombre" label="Nombre completo">
              <input id="ed-nombre" maxLength={100} value={ed.nombre} onChange={(e) => setEd({ ...ed, nombre: e.target.value })} className={campoCls} />
            </Campo>
            <Campo id="ed-email" label="Correo electrónico" error={errorEmail}>
              <input id="ed-email" type="email" maxLength={100} value={ed.email} aria-invalid={!!errorEmail}
                onChange={(e) => { setEd({ ...ed, email: e.target.value }); setErrorEmail(""); }} className={campoCls} />
            </Campo>
            <Campo id="ed-rol" label="Rol / Permisos">
              <select id="ed-rol" value={ed.rol} onChange={(e) => setEd({ ...ed, rol: e.target.value as Usuario["rol"] })} className={campoCls}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r === "Administrador" ? "Administrador (Dueño)" : r}</option>
                ))}
              </select>
            </Campo>
            <Campo id="ed-password" label="Contraseña nueva (opcional)">
              <input id="ed-password" type="password" value={ed.password} onChange={(e) => setEd({ ...ed, password: e.target.value })} placeholder="Sin cambios" className={campoCls} />
            </Campo>
          </div>
          <DialogFooter className="gap-2">
            <Pill variant="ghost" onClick={() => setEditar(null)}>Cancelar</Pill>
            <Pill variant="primary" onClick={() => void guardarEdicion()} disabled={ed.password !== "" && ed.password.length < 6} className="disabled:opacity-50">
              Guardar cambios
            </Pill>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Confirmar
        abierto={!!eliminar}
        onAbiertoChange={(v) => !v && setEliminar(null)}
        titulo="¿Eliminar esta cuenta de forma definitiva?"
        descripcion={eliminar ? `@${eliminar.usuario} · Solo para cuentas creadas por error. Si el empleado ya no trabaja aquí, usa «Dar de baja».` : ""}
        textoBoton="Eliminar"
        onConfirmar={() => eliminar && confirmarEliminar(eliminar)}
      />
    </>
  );
}

/* ---------------- Reportes ---------------- */

export function Reportes() {
  const tone = (a: string): "success" | "danger" | "warning" | "muted" =>
    a === "ENTRADA" || a === "ALTA" ? "success" : a === "SALIDA" || a === "BAJA" ? "danger" : a === "MODIFICACION" ? "warning" : "muted";

  /* RF-12 Exportación de lista de compras (el servidor devuelve los insumos en alerta, SIN EXISTENCIA primero) */
  const { datos: lista } = useDatos(obtenerListaCompras);
  const bajos = lista ?? [];
  const exportarListaCompras = async () => {
    try {
      const filas: FilaCompra[] = await obtenerListaCompras(); // datos al momento de exportar
      if (filas.length === 0) {
        toast.info("No hay insumos con stock bajo");
        return;
      }
      descargarArchivo("lista-de-compras-picasso.xlsx", crearListaCompras(filas, formatoFecha(new Date())));
    } catch (e) {
      toast.error("No se generó la lista de compras", { description: e instanceof Error ? e.message : "" });
    }
  };

  /* RF-11 Reportes de consumo por semana o mes (el servidor suma las salidas del periodo) */
  const [periodo, setPeriodo] = useState<"Semana" | "Mes">("Semana");
  const { datos: consumoDatos, cargando: cargandoConsumo, error: errorConsumo, recargar: recargarConsumo } = useDatos(
    () => obtenerConsumo(periodo === "Semana" ? "semana" : "mes"),
    [periodo],
  );
  const consumo = consumoDatos ?? [];

  /* RF-13 Bitácora de movimientos */
  const { datos: bitacoraDatos, cargando: cargandoBitacora, error: errorBitacora, recargar: recargarBitacora } = useDatos(obtenerBitacora);
  const bitacora = bitacoraDatos ?? [];

  /* RF-13 Bitácora: exportar el historial */
  const exportarBitacora = () => {
    const blob = crearReporteExcel({
      hoja: "Bitácora",
      titulo: "Picasso Autosport · Bitácora de actividades",
      subtitulo: `Movimientos registrados en el sistema · Generada el ${formatoFecha(new Date())}`,
      pie: "Picasso Autosport · Bitácora de actividades",
      columnas: [
        { titulo: "Fecha y hora", ancho: 17 },
        { titulo: "Usuario", ancho: 14 },
        { titulo: "Acción", ancho: 15 },
        { titulo: "Módulo", ancho: 11 },
        { titulo: "Detalle", ancho: 70 },
      ],
      filas: bitacora.map((m) => [m.fecha, "@" + m.usuario, m.accion, m.modulo, m.detalle]),
      columnaResaltada: 2,
      resalte: (f) => (f[2] === "SALIDA" || f[2] === "BAJA" ? "rojo" : f[2] === "MODIFICACION" ? "amarillo" : f[2] === "LOGIN" ? null : "verde"),
      total: `Total de movimientos: ${bitacora.length}`,
    });
    descargarArchivo("bitacora-picasso.xlsx", blob);
  };

  return (
    <>
      <PageTitle
        title="Reportes y auditoría"
        subtitle="Consumo de material, lista de compras e historial de movimientos."
      />

      <Card className="mb-6">
        <CardHeader
          title="Consumo por periodo"
          subtitle={`Insumos más gastados en ${periodo === "Semana" ? "los últimos 7 días" : "los últimos 30 días"}.`}
          action={
            <div className="flex gap-1">
              {(["Semana", "Mes"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPeriodo(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${periodo === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  <CalendarRange className="h-3.5 w-3.5" /> {p}
                </button>
              ))}
            </div>
          }
        />
        {!consumoDatos ? (
          <EstadoCarga cargando={cargandoConsumo} error={errorConsumo} onReintentar={recargarConsumo} />
        ) : consumo.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No hay salidas registradas en este periodo.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {consumo.map(({ idInsumo, nombre, unidad, total }, n) => (
              <li key={idInsumo} className="flex items-center gap-4 px-6 py-3 text-sm">
                <span className="w-6 text-right font-semibold tabular-nums text-muted-foreground">{n + 1}.</span>
                <span className="flex-1">
                  <span className="font-mono font-bold">{idInsumo}</span>
                  <span className="text-muted-foreground"> · {nombre}</span>
                </span>
                <span className="font-semibold tabular-nums">{total} {unidad}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mb-6 border-success/40">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Generar lista de compras</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Exporta a Excel los insumos POR ACABARSE o SIN EXISTENCIA ({bajos.length} actualmente).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void exportarListaCompras()}
            className="inline-flex items-center gap-2 rounded-full bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="h-4 w-4" /> Exportar insumos bajos
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Bitácora de actividades"
          subtitle="Cada acción queda registrada con fecha, usuario y detalle."
          action={
            <Pill variant="sand" onClick={exportarBitacora} disabled={!bitacoraDatos}>
              <Download className="h-4 w-4" /> Exportar reporte
            </Pill>
          }
        />
        {!bitacoraDatos && <EstadoCarga cargando={cargandoBitacora} error={errorBitacora} onReintentar={recargarBitacora} />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead className="bg-primary">
              <tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Módulo</Th>
                <Th>Detalle</Th>
              </tr>
            </thead>
            <tbody>
              {bitacora.map((m) => (
                <tr key={m.id} className={rowHover}>
                  <Td className="whitespace-nowrap text-muted-foreground">{m.fecha}</Td>
                  <Td className="font-medium">@{m.usuario}</Td>
                  <Td>
                    <Badge tone={tone(m.accion)}>{m.accion}</Badge>
                  </Td>
                  <Td className="text-muted-foreground">{m.modulo}</Td>
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
