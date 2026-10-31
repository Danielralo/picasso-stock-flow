import { registrarEntradas } from "@/lib/api";

/** Línea del ticket de reabastecimiento que se envía a servidor/api/reabastecimiento.php. */
export type DetalleTicket = { id_insumo: string; cantidad_agregada: number };

/** Recolecta solo los insumos con cantidad a ingresar mayor a 0. */
export function construirPayloadTicket(cantidades: Record<string, number>): DetalleTicket[] {
  return Object.entries(cantidades)
    .filter(([, c]) => Number.isFinite(c) && c > 0)
    .map(([id_insumo, cantidad_agregada]) => ({ id_insumo, cantidad_agregada }));
}

/** RF-03: registra las entradas en la base de datos y devuelve el número de ticket. */
export async function enviarTicketReabastecimiento(detalles: DetalleTicket[]) {
  if (detalles.length === 0) throw new Error("Indica al menos una cantidad mayor a 0");
  return registrarEntradas(detalles);
}
