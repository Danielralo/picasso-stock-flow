import thinner from "@/assets/thinner.jpg";
import lijas from "@/assets/lijas.jpg";
import barniz from "@/assets/barniz.jpg";

export type Insumo = {
  id: string;
  nombre: string;
  categoria: "Pinturas" | "Solventes" | "Lijas";
  unidad: string;
  existencia: number;
  minimo: number;
  imagen: string;
};

export const CATEGORIAS = ["Todas", "Pinturas", "Solventes", "Lijas"] as const;

export const INSUMOS: Insumo[] = [
  { id: "thinner", nombre: "Thinner estándar", categoria: "Solventes", unidad: "Galón", existencia: 2, minimo: 8, imagen: thinner },
  { id: "lija-600", nombre: "Lija P600", categoria: "Lijas", unidad: "Pliego", existencia: 0, minimo: 25, imagen: lijas },
  { id: "barniz", nombre: "Barniz 2K alto sólido", categoria: "Pinturas", unidad: "Litro", existencia: 4, minimo: 6, imagen: barniz },
  { id: "thinner-acr", nombre: "Thinner acrílico", categoria: "Solventes", unidad: "Galón", existencia: 12, minimo: 6, imagen: thinner },
  { id: "lija-1200", nombre: "Lija P1200", categoria: "Lijas", unidad: "Pliego", existencia: 9, minimo: 20, imagen: lijas },
  { id: "endurecedor", nombre: "Endurecedor rápido", categoria: "Pinturas", unidad: "Litro", existencia: 18, minimo: 5, imagen: barniz },
];

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
