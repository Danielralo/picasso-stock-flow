import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, PackagePlus, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearInsumo, editarInsumo, type Catalogos, type DatosInsumo } from "@/lib/api";
import type { Insumo } from "@/lib/picasso-data";
import { Pill } from "./ui-bits";

/** Valor especial del selector de marca para escribir una marca que no está en la lista (excepción 3b). */
const OTRA_MARCA = "__otra__";

/** «A, B o C» para los mensajes. */
function enLista(valores: string[]) {
  return valores.length > 1 ? `${valores.slice(0, -1).join(", ")} o ${valores[valores.length - 1]}` : (valores[0] ?? "");
}

/** Compara nombres de marca sin importar mayúsculas, acentos ni espacios de más (igual que MySQL). */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/**
 * RF-01, excepción 4c: la unidad debe corresponder a la categoría (por ejemplo, una pintura no va en Piezas
 * ni una cinta en Litros). Regresa el mensaje de error o null. La tabla de reglas llega de catalogos.php.
 */
export function errorDeUnidad(catalogos: Catalogos | null, idCategoria: string, unidad: string): string | null {
  if (!catalogos || !idCategoria || !unidad) return null;
  const categoria = catalogos.categorias.find((c) => String(c.idCategoria) === idCategoria)?.nombreCategoria;
  const permitidas = categoria ? catalogos.unidadesPorCategoria?.[categoria] : undefined;
  if (!categoria || !permitidas || permitidas.includes(unidad)) return null;
  return `La unidad «${unidad}» no corresponde a la categoría ${categoria}. Usa ${enLista(permitidas)}.`;
}

/** Reglas de RF-01 y RF-03 (el servidor las vuelve a revisar en insumos.php). */
function crearSchema(codigosExistentes: string[], catalogos: Catalogos | null, idActual?: string) {
  return z
    .object({
      idInsumo: z
        .string()
        .trim()
        .min(2, "Mínimo 2 caracteres")
        .max(10, "Máximo 10 caracteres")
        .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones")
        .refine((v) => !codigosExistentes.some((c) => c !== idActual && c.toLowerCase() === v.toLowerCase()), "Ese código ya existe"),
      nombreInsumo: z.string().trim().min(3, "Mínimo 3 caracteres").max(100, "Máximo 100 caracteres"),
      descripcionBreve: z.string().trim().min(5, "Mínimo 5 caracteres").max(200, "Máximo 200 caracteres"),
      unidad: z.string().min(1, "Selecciona una unidad"),
      stockMinimo: z.coerce.number({ message: "Ingresa un número" }).min(0, "No puede ser negativo").max(100000),
      idCategoria: z.string().min(1, "Selecciona una categoría"),
      idMarca: z.string().min(1, "Selecciona una marca"),
      marcaNueva: z.string(),
    })
    .superRefine((d, ctx) => {
      const error = errorDeUnidad(catalogos, d.idCategoria, d.unidad);
      if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["unidad"], message: error });
      const nueva = d.marcaNueva.replace(/\s+/g, " ").trim();
      if (d.idMarca === OTRA_MARCA && (nueva.length < 2 || nueva.length > 50)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["marcaNueva"], message: "Escribe la marca (de 2 a 50 caracteres)" });
      }
    });
}

type Campos = Record<keyof DatosInsumo, string>;
const VACIO: Campos = { idInsumo: "", nombreInsumo: "", descripcionBreve: "", unidad: "", stockMinimo: "", idCategoria: "", idMarca: "", marcaNueva: "" };

function camposDe(i: Insumo): Campos {
  return {
    idInsumo: i.codigo,
    nombreInsumo: i.nombre,
    descripcionBreve: i.descripcion,
    unidad: i.unidad,
    stockMinimo: String(i.minimo),
    idCategoria: String(i.idCategoria),
    idMarca: String(i.idMarca),
    marcaNueva: "",
  };
}

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand disabled:opacity-60 aria-[invalid=true]:border-destructive";

/**
 * Formulario de insumo. Sin `insumo` da de alta (RF-01); con `insumo` edita sus datos (RF-03).
 * La existencia no se captura aquí: un insumo nuevo empieza en 0 y se surte en «Reabastecer».
 */
export function InsumoDialog({
  abierto,
  onAbiertoChange,
  insumo,
  catalogos,
  codigosExistentes,
  onGuardado,
}: {
  abierto: boolean;
  onAbiertoChange: (v: boolean) => void;
  insumo?: Insumo | undefined;
  catalogos: Catalogos | null;
  codigosExistentes: string[];
  onGuardado: (codigo: string, nombre: string) => void;
}) {
  const editando = !!insumo;
  const [f, setF] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (abierto) {
      setF(insumo ? camposDe(insumo) : VACIO);
      setErrores({});
    }
  }, [abierto, insumo]);

  const set = (k: keyof Campos, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrores((p) => ({ ...p, [k]: undefined }));
  };

  /** Al cambiar la unidad o la categoría se avisa de inmediato si no van juntas (excepción 4c). */
  const cambiarUnidadOCategoria = (k: "unidad" | "idCategoria", v: string) => {
    const siguiente = { ...f, [k]: v };
    set(k, v);
    const error = errorDeUnidad(catalogos, siguiente.idCategoria, siguiente.unidad);
    if (error) toast.error("Unidad no válida para esta categoría", { description: error });
  };

  const errorUnidad = errorDeUnidad(catalogos, f.idCategoria, f.unidad);
  const categoriaActual = catalogos?.categorias.find((c) => String(c.idCategoria) === f.idCategoria)?.nombreCategoria;
  const permitidas = categoriaActual ? catalogos?.unidadesPorCategoria?.[categoriaActual] : undefined;
  const marcaEscrita = f.marcaNueva.replace(/\s+/g, " ").trim();
  const marcaExistente =
    f.idMarca === OTRA_MARCA && marcaEscrita ? catalogos?.marcas.find((m) => normalizar(m.nombreMarca) === normalizar(marcaEscrita)) : undefined;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = crearSchema(codigosExistentes, catalogos, insumo?.codigo).safeParse(f);
    if (!r.success) {
      const errs: Partial<Record<keyof Campos, string>> = {};
      for (const issue of r.error.issues) {
        const k = issue.path[0] as keyof Campos;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrores(errs);
      if (errs.unidad && errorUnidad) toast.error("No se puede guardar el insumo", { description: errorUnidad });
      return;
    }
    setGuardando(true);
    try {
      const nueva = r.data.idMarca === OTRA_MARCA && !marcaExistente;
      const datos: DatosInsumo = {
        ...r.data,
        idInsumo: r.data.idInsumo.toUpperCase(),
        idCategoria: Number(r.data.idCategoria),
        // Si la marca escrita ya existe en la lista se usa esa; si no, el servidor la registra en MARCA
        idMarca: nueva ? 0 : marcaExistente ? marcaExistente.idMarca : Number(r.data.idMarca),
        marcaNueva: nueva ? marcaEscrita : "",
      };
      if (editando) await editarInsumo(datos);
      else await crearInsumo(datos);
      toast.success(editando ? "Cambios guardados" : "Insumo dado de alta", {
        description: `${datos.idInsumo} · ${datos.nombreInsumo}${nueva ? ` · marca nueva «${marcaEscrita}» registrada` : ""}`,
      });
      onGuardado(datos.idInsumo, datos.nombreInsumo);
      onAbiertoChange(false);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo guardar el insumo";
      if (mensaje.includes("código")) setErrores({ idInsumo: mensaje });
      else if (mensaje.includes("unidad")) setErrores({ unidad: mensaje });
      else if (mensaje.includes("marca")) setErrores({ marcaNueva: mensaje });
      toast.error("No se pudo guardar el insumo", { description: mensaje });
    } finally {
      setGuardando(false);
    }
  };

  const Err = ({ k }: { k: keyof Campos }) =>
    errores[k] ? <p className="mt-1 text-xs font-medium text-destructive">{errores[k]}</p> : null;
  const Lbl = ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children} <span className="text-destructive">*</span>
    </label>
  );

  return (
    <Dialog open={abierto} onOpenChange={onAbiertoChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar insumo" : "Dar de alta un insumo"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Corrige los datos del insumo. La existencia se cambia en «Reabastecer» o «Entregar»."
              : "Todos los campos son obligatorios. El insumo empieza con existencia 0."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
          <div>
            <Lbl htmlFor="id_insumo">Código del material</Lbl>
            <input id="id_insumo" className={inputCls} placeholder="Ej. DC2000" value={f.idInsumo} disabled={editando} onChange={(e) => set("idInsumo", e.target.value)} />
            <Err k="idInsumo" />
          </div>
          <div>
            <Lbl htmlFor="stock_minimo">Stock mínimo</Lbl>
            <input id="stock_minimo" type="number" min={0} step="any" className={inputCls} placeholder="Ej. 5" value={f.stockMinimo} onChange={(e) => set("stockMinimo", e.target.value)} />
            <Err k="stockMinimo" />
          </div>
          <div className="sm:col-span-2">
            <Lbl htmlFor="nombre_insumo">Nombre</Lbl>
            <input id="nombre_insumo" className={inputCls} placeholder="Ej. Barniz 2K alto sólido" value={f.nombreInsumo} onChange={(e) => set("nombreInsumo", e.target.value)} />
            <Err k="nombreInsumo" />
          </div>
          <div className="sm:col-span-2">
            <Lbl htmlFor="descripcion_breve">Descripción breve</Lbl>
            <textarea id="descripcion_breve" rows={3} className={inputCls + " resize-none"} placeholder="Uso, presentación, características…" value={f.descripcionBreve} onChange={(e) => set("descripcionBreve", e.target.value)} />
            <Err k="descripcionBreve" />
          </div>
          <div>
            <Lbl htmlFor="unidad_medida">Unidad de medida</Lbl>
            <Select value={f.unidad} onValueChange={(v) => cambiarUnidadOCategoria("unidad", v)}>
              <SelectTrigger id="unidad_medida" aria-invalid={!!errorUnidad} className="rounded-xl aria-[invalid=true]:border-destructive">
                <SelectValue placeholder="Selecciona…" />
              </SelectTrigger>
              <SelectContent>
                {(catalogos?.unidades ?? []).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            {errorUnidad ? (
              <p role="alert" className="mt-1 text-xs font-medium text-destructive">{errorUnidad}</p>
            ) : (
              <Err k="unidad" />
            )}
          </div>
          <div>
            <Lbl htmlFor="id_categoria">Categoría</Lbl>
            <Select value={f.idCategoria} onValueChange={(v) => cambiarUnidadOCategoria("idCategoria", v)}>
              <SelectTrigger id="id_categoria" className="rounded-xl"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {(catalogos?.categorias ?? []).map((c) => <SelectItem key={c.idCategoria} value={String(c.idCategoria)}>{c.nombreCategoria}</SelectItem>)}
              </SelectContent>
            </Select>
            <Err k="idCategoria" />
            {permitidas && !errorUnidad && (
              <p className="mt-1 text-xs text-muted-foreground">
                {categoriaActual}: {enLista(permitidas)}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Lbl htmlFor="id_marca">Marca</Lbl>
            <Select value={f.idMarca} onValueChange={(v) => set("idMarca", v)}>
              <SelectTrigger id="id_marca" className="rounded-xl"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                {(catalogos?.marcas ?? []).map((m) => <SelectItem key={m.idMarca} value={String(m.idMarca)}>{m.nombreMarca}</SelectItem>)}
                <SelectSeparator />
                <SelectItem value={OTRA_MARCA}>+ Otra marca (escribirla)</SelectItem>
              </SelectContent>
            </Select>
            <Err k="idMarca" />
            {f.idMarca === OTRA_MARCA && (
              <div className="mt-2">
                <input
                  id="marca_nueva"
                  aria-label="Nombre de la marca nueva"
                  className={inputCls}
                  placeholder="Escribe la marca, por ejemplo Comex"
                  maxLength={50}
                  autoFocus
                  value={f.marcaNueva}
                  aria-invalid={!!errores.marcaNueva}
                  onChange={(e) => set("marcaNueva", e.target.value)}
                />
                {errores.marcaNueva ? (
                  <Err k="marcaNueva" />
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {marcaExistente
                      ? `«${marcaExistente.nombreMarca}» ya está en la lista: se usará esa.`
                      : "Al guardar, la marca se agrega a la lista de marcas."}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:col-span-2">
            <Pill variant="ghost" onClick={() => onAbiertoChange(false)}>Cancelar</Pill>
            <Pill variant="primary" type="submit" disabled={guardando}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : editando ? <Save className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar"}
            </Pill>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Botón «Nuevo insumo» de la pantalla Reabastecer (RF-01). */
export function NuevoInsumoDialog({
  catalogos,
  codigosExistentes,
  onCreado,
}: {
  catalogos: Catalogos | null;
  codigosExistentes: string[];
  onCreado: (codigo: string, nombre: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Pill variant="primary" onClick={() => setAbierto(true)}>
        <PackagePlus className="h-4 w-4" /> Nuevo insumo
      </Pill>
      <InsumoDialog abierto={abierto} onAbiertoChange={setAbierto} catalogos={catalogos} codigosExistentes={codigosExistentes} onGuardado={onCreado} />
    </>
  );
}
