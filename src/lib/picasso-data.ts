import thinner from "@/assets/thinner.jpg";
import lijas from "@/assets/lijas.jpg";
import barniz from "@/assets/barniz.jpg";
import cinta from "@/assets/cinta.jpg";

export type Categoria = "Lijas" | "Cintas" | "Pinturas" | "Solventes" | "Barnices";

export type Insumo = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: Categoria;
  unidad: string;
  existencia: number;
  minimo: number;
  imagen: string;
};

/** Orden operativo: Lijas y Cintas primero, Barnices al final. */
export const ORDEN_CATEGORIAS: Categoria[] = ["Lijas", "Cintas", "Pinturas", "Solventes", "Barnices"];
export const CATEGORIAS = ["Todas", ...ORDEN_CATEGORIAS] as const;

const BASE: Insumo[] = [
  { id: "lija-600", codigo: "LJ600", nombre: "Lija de agua grano P600", categoria: "Lijas", unidad: "Pliego", existencia: 0, minimo: 25, imagen: lijas },
  { id: "lija-1200", codigo: "LJ1200", nombre: "Lija de agua grano P1200", categoria: "Lijas", unidad: "Pliego", existencia: 9, minimo: 20, imagen: lijas },
  { id: "cinta-48", codigo: "CM2448", nombre: "Cinta masking automotriz 48 mm", categoria: "Cintas", unidad: "Rollo", existencia: 14, minimo: 6, imagen: cinta },
  { id: "endurecedor", codigo: "EN4010", nombre: "Endurecedor rápido para pintura 2K", categoria: "Pinturas", unidad: "Litro", existencia: 18, minimo: 5, imagen: barniz },
  { id: "thinner", codigo: "TH100", nombre: "Thinner estándar de limpieza", categoria: "Solventes", unidad: "Galón", existencia: 2, minimo: 8, imagen: thinner },
  { id: "thinner-acr", codigo: "TA300", nombre: "Thinner acrílico de alta pureza", categoria: "Solventes", unidad: "Galón", existencia: 12, minimo: 6, imagen: thinner },
  { id: "barniz", codigo: "DC2000", nombre: "Barniz 2K alto sólido transparente", categoria: "Barnices", unidad: "Litro", existencia: 4, minimo: 6, imagen: barniz },
];

export const INSUMOS: Insumo[] = [...BASE].sort(
  (x, y) => ORDEN_CATEGORIAS.indexOf(x.categoria) - ORDEN_CATEGORIAS.indexOf(y.categoria),
);

export const ROLES = ["Administrador", "Encargado"] as const;

export type Usuario = {
  id: string;
  nombre: string;
  usuario: string;
  rol: "Administrador" | "Encargado";
  activo: boolean;
};

export const USUARIOS: Usuario[] = [
  { id: "1", nombre: "Hector Ramos", usuario: "hramos", rol: "Administrador", activo: true },
  { id: "2", nombre: "Lucía Márquez", usuario: "lmarquez", rol: "Encargado", activo: true },
  { id: "3", nombre: "Andrés Salgado", usuario: "asalgado", rol: "Encargado", activo: true },
  { id: "4", nombre: "Diana Peña", usuario: "dpena", rol: "Encargado", activo: false },
];

export type Movimiento = {
  id: string;
  fecha: string;
  usuario: string;
  accion: "ENTRADA" | "SALIDA" | "EDICIÓN";
  detalle: string;
};

export const BITACORA: Movimiento[] = [
  { id: "1", fecha: "30/09/2026 09:42", usuario: "hramos", accion: "ENTRADA", detalle: "Reabastecimiento: +12 Thinner acrílico" },
  { id: "2", fecha: "30/09/2026 09:05", usuario: "lmarquez", accion: "SALIDA", detalle: "Entrega a J. Ortega: 6 Lija P600" },
  { id: "3", fecha: "29/09/2026 18:20", usuario: "hramos", accion: "EDICIÓN", detalle: "Mínimo de Barniz 2K actualizado a 6 L" },
  { id: "4", fecha: "29/09/2026 15:11", usuario: "lmarquez", accion: "SALIDA", detalle: "Entrega a D. Peña: 2 L Barniz 2K" },
  { id: "5", fecha: "29/09/2026 11:30", usuario: "hramos", accion: "ENTRADA", detalle: "Reabastecimiento: +30 Lija P1200" },
];

export function estadoStock(i: Insumo) {
  if (i.existencia === 0) return "SIN EXISTENCIA" as const;
  if (i.existencia < i.minimo) return "POR ACABARSE" as const;
  return "DISPONIBLE" as const;
}
