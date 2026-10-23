import type { Categoria } from "@/lib/picasso-data";

/** Línea del ticket que se envía al backend. */
export type DetalleTicket = { id_insumo: string; cantidad_agregada: number };

/** Recolecta solo los insumos con cantidad a ingresar mayor a 0. */
export function construirPayloadTicket(cantidades: Record<string, number>): DetalleTicket[] {
  return Object.entries(cantidades)
    .filter(([, c]) => Number.isFinite(c) && c > 0)
    .map(([id_insumo, cantidad_agregada]) => ({ id_insumo, cantidad_agregada }));
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Simula POST /api/reabastecimiento.php. En producción reemplazar por:
 *   fetch("/api/reabastecimiento.php", { method: "POST", headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ id_usuario, detalles }) }).then(r => r.json())
 */
export async function enviarTicketReabastecimiento(usuario: string, detalles: DetalleTicket[]) {
  if (detalles.length === 0) throw new Error("No hay cantidades para registrar.");
  console.info("POST /api/reabastecimiento.php →", JSON.stringify({ usuario, detalles }));
  await espera(600);
  return { ok: true, id_ticket: Math.floor(1000 + Math.random() * 9000) };
}

/* ----------- Catálogos 3FN (mock de tablas CATEGORIAS y MARCAS) ----------- */
export const CATEGORIAS_DB: { id_categoria: number; nombre: Categoria }[] = [
  { id_categoria: 1, nombre: "Lijas" },
  { id_categoria: 2, nombre: "Cintas" },
  { id_categoria: 3, nombre: "Pinturas" },
  { id_categoria: 4, nombre: "Solventes" },
  { id_categoria: 5, nombre: "Barnices" },
];

export const MARCAS_DB = [
  { id_marca: 1, nombre: "3M" },
  { id_marca: 2, nombre: "Comex" },
  { id_marca: 3, nombre: "PPG" },
  { id_marca: 4, nombre: "Sherwin-Williams" },
  { id_marca: 5, nombre: "Norton" },
];

export const UNIDADES_MEDIDA = ["Litros", "Latas", "Pliegos", "Piezas"] as const;

export type NuevoInsumoPayload = {
  id_insumo: string;
  nombre_insumo: string;
  descripcion_breve: string;
  unidad_medida: (typeof UNIDADES_MEDIDA)[number];
  stock_minimo: number;
  id_categoria: number;
  id_marca: number;
};

/** Simula POST /api/insumos.php */
export async function guardarInsumo(payload: NuevoInsumoPayload) {
  console.info("POST /api/insumos.php →", JSON.stringify(payload));
  await espera(600);
  return { ok: true };
}
