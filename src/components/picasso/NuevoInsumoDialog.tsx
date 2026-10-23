import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSUMOS, type Insumo } from "@/lib/picasso-data";
import {
  CATEGORIAS_DB,
  MARCAS_DB,
  UNIDADES_MEDIDA,
  guardarInsumo,
  type NuevoInsumoPayload,
} from "@/lib/reabastecimiento-api";
import { Pill } from "./ui-bits";

const schema = z.object({
  id_insumo: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Za-z0-9-]+$/, "Solo letras, números y guiones")
    .refine((v) => !INSUMOS.some((i) => i.codigo.toLowerCase() === v.toLowerCase()), "Ese código ya existe"),
  nombre_insumo: z.string().trim().min(3, "Mínimo 3 caracteres").max(100, "Máximo 100 caracteres"),
  descripcion_breve: z.string().trim().min(5, "Mínimo 5 caracteres").max(255, "Máximo 255 caracteres"),
  unidad_medida: z.enum(UNIDADES_MEDIDA, { message: "Selecciona una unidad" }),
  stock_minimo: z.coerce.number({ message: "Ingresa un número" }).int("Debe ser entero").min(0, "No puede ser negativo").max(100000),
  id_categoria: z.coerce.number({ message: "Selecciona una categoría" }).int().positive("Selecciona una categoría"),
  id_marca: z.coerce.number({ message: "Selecciona una marca" }).int().positive("Selecciona una marca"),
});

type Campos = Record<keyof NuevoInsumoPayload, string>;
const VACIO: Campos = {
  id_insumo: "",
  nombre_insumo: "",
  descripcion_breve: "",
  unidad_medida: "",
  stock_minimo: "",
  id_categoria: "",
  id_marca: "",
};

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-sand";

export function NuevoInsumoDialog({ onCreado }: { onCreado: (i: Insumo) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<Campos>(VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({});
  const [guardando, setGuardando] = useState(false);

  const set = (k: keyof Campos, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrores((p) => ({ ...p, [k]: undefined }));
  };

  const cerrar = (v: boolean) => {
    setAbierto(v);
    if (!v) {
      setF(VACIO);
      setErrores({});
    }
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      const errs: Partial<Record<keyof Campos, string>> = {};
      for (const issue of r.error.issues) {
        const k = issue.path[0] as keyof Campos;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErrores(errs);
      return;
    }
    setGuardando(true);
    try {
      const data = r.data as NuevoInsumoPayload;
      await guardarInsumo(data);
      const cat = CATEGORIAS_DB.find((c) => c.id_categoria === data.id_categoria)!.nombre;
      const ref = INSUMOS.find((i) => i.categoria === cat) ?? INSUMOS[0]!;
      onCreado({
        id: data.id_insumo.toLowerCase(),
        codigo: data.id_insumo.toUpperCase(),
        nombre: data.nombre_insumo,
        categoria: cat,
        unidad: data.unidad_medida,
        existencia: 0,
        minimo: data.stock_minimo,
        imagen: ref.imagen,
      });
      toast.success("Insumo dado de alta", { description: `${data.id_insumo.toUpperCase()} · ${data.nombre_insumo}` });
      cerrar(false);
    } catch {
      toast.error("No se pudo guardar el insumo");
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
    <>
      <Pill variant="primary" onClick={() => setAbierto(true)}>
        <PackagePlus className="h-4 w-4" /> Nuevo insumo
      </Pill>
      <Dialog open={abierto} onOpenChange={cerrar}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dar de alta un insumo</DialogTitle>
            <DialogDescription>Todos los campos son obligatorios.</DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
            <div>
              <Lbl htmlFor="id_insumo">Código de insumo</Lbl>
              <input id="id_insumo" className={inputCls} placeholder="Ej. DC2000" value={f.id_insumo} onChange={(e) => set("id_insumo", e.target.value)} />
              <Err k="id_insumo" />
            </div>
            <div>
              <Lbl htmlFor="stock_minimo">Stock mínimo</Lbl>
              <input id="stock_minimo" type="number" min={0} className={inputCls} placeholder="Ej. 5" value={f.stock_minimo} onChange={(e) => set("stock_minimo", e.target.value)} />
              <Err k="stock_minimo" />
            </div>
            <div className="sm:col-span-2">
              <Lbl htmlFor="nombre_insumo">Nombre</Lbl>
              <input id="nombre_insumo" className={inputCls} placeholder="Ej. Barniz 2K alto sólido" value={f.nombre_insumo} onChange={(e) => set("nombre_insumo", e.target.value)} />
              <Err k="nombre_insumo" />
            </div>
            <div className="sm:col-span-2">
              <Lbl htmlFor="descripcion_breve">Descripción breve</Lbl>
              <textarea id="descripcion_breve" rows={3} className={inputCls + " resize-none"} placeholder="Uso, presentación, características…" value={f.descripcion_breve} onChange={(e) => set("descripcion_breve", e.target.value)} />
              <Err k="descripcion_breve" />
            </div>
            <div>
              <Lbl htmlFor="unidad_medida">Unidad de medida</Lbl>
              <Select value={f.unidad_medida} onValueChange={(v) => set("unidad_medida", v)}>
                <SelectTrigger id="unidad_medida" className="rounded-xl"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {UNIDADES_MEDIDA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Err k="unidad_medida" />
            </div>
            <div>
              <Lbl htmlFor="id_categoria">Categoría</Lbl>
              <Select value={f.id_categoria} onValueChange={(v) => set("id_categoria", v)}>
                <SelectTrigger id="id_categoria" className="rounded-xl"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DB.map((c) => <SelectItem key={c.id_categoria} value={String(c.id_categoria)}>{c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Err k="id_categoria" />
            </div>
            <div className="sm:col-span-2">
              <Lbl htmlFor="id_marca">Marca</Lbl>
              <Select value={f.id_marca} onValueChange={(v) => set("id_marca", v)}>
                <SelectTrigger id="id_marca" className="rounded-xl"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {MARCAS_DB.map((m) => <SelectItem key={m.id_marca} value={String(m.id_marca)}>{m.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Err k="id_marca" />
            </div>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Pill variant="ghost" onClick={() => cerrar(false)}>Cancelar</Pill>
              <Pill variant="primary" type="submit" disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                {guardando ? "Guardando…" : "Guardar insumo"}
              </Pill>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
