import thinner from "@/assets/thinner.jpg";
import lijas from "@/assets/lijas.jpg";
import barniz from "@/assets/barniz.jpg";
import cinta from "@/assets/cinta.jpg";

/*
 * Tipos y reglas que usan las pantallas.
 * Los datos ya no viven aquí: llegan de la base de datos MySQL a través de la API en PHP
 * (ver src/lib/api.ts y la carpeta servidor/api).
 */

/* ---------------- CATEGORIA ---------------- */

/** Orden que pidió el cliente: lijas y cintas primero, barniz al final (mismo orden que la API). */
export const ORDEN_CATEGORIAS = ["Lijas", "Cintas", "Pinturas", "Solventes", "Consumibles", "Barnices"] as const;
export type Categoria = string;
export const CATEGORIAS = ["Todas", ...ORDEN_CATEGORIAS] as const;

/** Imagen ilustrativa de cada categoría (la base de datos no guarda imágenes). */
const IMAGEN_CATEGORIA: Record<string, string> = {
  Lijas: lijas,
  Cintas: cinta,
  Pinturas: barniz,
  Solventes: thinner,
  Consumibles: cinta,
  Barnices: barniz,
};
export function imagenDe(categoria: string) {
  return IMAGEN_CATEGORIA[categoria] ?? barniz;
}

/* ---------------- INSUMO ---------------- */

/** Valores del diccionario de datos del ERS para la unidad de medida. */
export const UNIDADES_MEDIDA = ["Litros", "Galones", "Pliegos", "Piezas", "Rollos"] as const;
export type Unidad = (typeof UNIDADES_MEDIDA)[number];

export type EstadoAlerta = "DISPONIBLE" | "POR ACABARSE" | "SIN EXISTENCIA";

export type Insumo = {
  /** idInsumo: código del material del proveedor (por ejemplo, DC2000). */
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  idCategoria: number;
  categoria: Categoria;
  idMarca: number;
  marca: string;
  unidad: string;
  existencia: number;
  minimo: number;
  estado: EstadoAlerta;
  imagen: string;
};

/** RF-06: el estado lo calcula el servidor (estadoAlerta) después de cada alta, entrada, edición o salida. */
export function estadoStock(i: Insumo): EstadoAlerta {
  return i.estado;
}

/* ---------------- USUARIO ---------------- */

export const ROLES = ["Administrador", "Encargado"] as const;
export type Rol = (typeof ROLES)[number];

export type Usuario = {
  id: number;
  nombre: string;
  usuario: string;
  email: string;
  rol: Rol;
  activo: boolean;
};

export const USUARIO_VALIDO = /^[a-z0-9._]{3,20}$/;
export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------- BITACORA_ACTIVIDAD ---------------- */

export type TipoAccion = "ALTA" | "BAJA" | "MODIFICACION" | "ENTRADA" | "SALIDA" | "LOGIN";

export type Movimiento = {
  id: number;
  fecha: string;
  usuario: string;
  accion: TipoAccion;
  modulo: "Usuario" | "Insumo";
  detalle: string;
};

/** dd/mm/aaaa hh:mm */
export function formatoFecha(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Convierte un DATETIME de MySQL ("2026-10-28 12:53:30") al formato dd/mm/aaaa hh:mm. */
export function fechaDeMysql(valor: string) {
  const [f = "", h = ""] = valor.split(" ");
  const [a, m, d] = f.split("-");
  return `${d}/${m}/${a} ${h.slice(0, 5)}`;
}
