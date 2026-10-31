import { useCallback, useEffect, useState } from "react";
import { fechaDeMysql, imagenDe, type EstadoAlerta, type Insumo, type Movimiento, type Rol, type Usuario } from "@/lib/picasso-data";

/*
 * api.ts — Única puerta de las pantallas hacia el servidor.
 *
 * Cada función hace una petición HTTP a un archivo PHP de la carpeta servidor/api
 * y convierte los nombres de las columnas de MySQL (idInsumo, stockActual…)
 * a los nombres que usan las pantallas (id, existencia…).
 *
 * En XAMPP las pantallas y la API están en la misma carpeta (http://localhost/picasso),
 * por eso la dirección es relativa: «./api». Con `npm run dev` se usa «/picasso/api»
 * y Vite reenvía esas peticiones a Apache (ver vite.config.ts).
 */
const API = import.meta.env.VITE_API_URL ?? "./api";

/* ------------------------- Cliente HTTP ------------------------- */

/** Se ejecuta cuando el servidor responde 401 (la sesión terminó o la cuenta se dio de baja). */
let alExpirarSesion: (mensaje: string) => void = () => {};
export function cuandoExpireLaSesion(fn: (mensaje: string) => void) {
  alExpirarSesion = fn;
}

type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function pedir<T>(archivo: string, metodo: Metodo = "GET", datos?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}/${archivo}`, {
      method: metodo,
      credentials: "include", // envía la cookie de sesión de PHP
      headers: datos === undefined ? {} : { "Content-Type": "application/json" },
      ...(datos === undefined ? {} : { body: JSON.stringify(datos) }),
    });
  } catch {
    throw new Error("No hay conexión con el servidor. Revisa que Apache y MySQL estén encendidos en XAMPP.");
  }
  let json: { ok?: boolean; error?: string } & Record<string, unknown>;
  try {
    json = await respuesta.json();
  } catch {
    throw new Error("El servidor no respondió correctamente. Revisa que Apache y MySQL estén encendidos en XAMPP.");
  }
  if (!respuesta.ok || !json.ok) {
    const mensaje = json.error ?? "Ocurrió un error en el servidor.";
    if (respuesta.status === 401 && archivo !== "sesion.php") alExpirarSesion(mensaje);
    throw new Error(mensaje);
  }
  return json as T;
}

/* ------------------------- Sesión (sesion.php) ------------------------- */

export type Sesion = { idUsuario: number; nombre: string; usuario: string; rol: Rol };
type SesionDb = { idUsuario: number; nombreCompleto: string; username: string; rolUsuario: Rol };
const aSesion = (u: SesionDb): Sesion => ({ idUsuario: u.idUsuario, nombre: u.nombreCompleto, usuario: u.username, rol: u.rolUsuario });

export async function sesionActual(): Promise<Sesion | null> {
  const r = await pedir<{ usuario: SesionDb | null }>("sesion.php");
  return r.usuario ? aSesion(r.usuario) : null;
}
export async function iniciarSesion(username: string, password: string): Promise<Sesion> {
  const r = await pedir<{ usuario: SesionDb }>("sesion.php", "POST", { accion: "iniciar", username, password });
  return aSesion(r.usuario);
}
export async function cerrarSesion() {
  await pedir("sesion.php", "POST", { accion: "cerrar" });
}
/** RNF-09: «¿Olvidaste tu contraseña?». Al Encargado lo atiende el Administrador; al Administrador le llega un correo. */
export async function solicitarClave(username: string) {
  return pedir<{ mensaje: string; porCorreo: boolean }>("sesion.php", "POST", { accion: "solicitar_clave", username });
}
/** RNF-09: revisa que el enlace del correo siga sirviendo y regresa el usuario. */
export async function revisarEnlace(token: string) {
  return pedir<{ username: string }>("sesion.php", "POST", { accion: "revisar_enlace", token });
}
/** RNF-09: guarda la contraseña nueva que el Administrador escribió desde el enlace del correo. */
export async function restablecerClave(token: string, password: string) {
  return pedir<{ mensaje: string }>("sesion.php", "POST", { accion: "restablecer", token, password });
}

/* ------------------------- Catálogos (catalogos.php) ------------------------- */

export type Catalogos = {
  categorias: { idCategoria: number; nombreCategoria: string }[];
  marcas: { idMarca: number; nombreMarca: string }[];
  unidades: string[];
  /** Unidades que se permiten en cada categoría (RF-01, excepción 4c). La regla está en funciones.php. */
  unidadesPorCategoria: Record<string, string[]>;
};
export const obtenerCatalogos = () => pedir<Catalogos>("catalogos.php");

/* ------------------------- Insumos (insumos.php) ------------------------- */

type InsumoDb = {
  idInsumo: string;
  nombreInsumo: string;
  descripcionBreve: string;
  idCategoria: number;
  nombreCategoria: string;
  idMarca: number;
  nombreMarca: string;
  unidad: string;
  stockActual: string | number;
  stockMinimo: string | number;
  estadoAlerta: EstadoAlerta;
};
const aInsumo = (i: InsumoDb): Insumo => ({
  id: i.idInsumo,
  codigo: i.idInsumo,
  nombre: i.nombreInsumo,
  descripcion: i.descripcionBreve,
  idCategoria: Number(i.idCategoria),
  categoria: i.nombreCategoria,
  idMarca: Number(i.idMarca),
  marca: i.nombreMarca,
  unidad: i.unidad,
  existencia: Number(i.stockActual),
  minimo: Number(i.stockMinimo),
  estado: i.estadoAlerta,
  imagen: imagenDe(i.nombreCategoria),
});

export async function obtenerInsumos(): Promise<Insumo[]> {
  const r = await pedir<{ insumos: InsumoDb[] }>("insumos.php");
  return r.insumos.map(aInsumo);
}

/** Datos del formulario de RF-01 / RF-03 con los nombres de las columnas de la tabla INSUMO. */
export type DatosInsumo = {
  idInsumo: string;
  nombreInsumo: string;
  descripcionBreve: string;
  unidad: string;
  stockMinimo: number;
  idCategoria: number;
  idMarca: number;
  /** RF-01, excepción 3b: marca escrita a mano que no estaba en la lista; el servidor la registra en MARCA. */
  marcaNueva: string;
};
export const crearInsumo = (d: DatosInsumo) => pedir<{ idInsumo: string; idMarca: number }>("insumos.php", "POST", d); // RF-01
export const editarInsumo = (d: DatosInsumo) => pedir<{ idMarca: number }>("insumos.php", "PUT", d); // RF-03
export const darDeBajaInsumo = (idInsumo: string) => pedir(`insumos.php?idInsumo=${encodeURIComponent(idInsumo)}`, "DELETE"); // RF-04

/* ------------------------- Entradas y salidas ------------------------- */

/** RF-03: entradas de material (reabastecimiento.php). */
export const registrarEntradas = (detalles: { id_insumo: string; cantidad_agregada: number }[]) =>
  pedir<{ id_ticket: number; insumos: number }>("reabastecimiento.php", "POST", { detalles });

/** RF-10: registrar el retiro del carrito (salidas.php). */
export const registrarSalida = (d: {
  trabajadorDestino: string;
  vehiculo: string;
  notas: string;
  insumos: { idInsumo: string; cantidad: number }[];
}) => pedir<{ detalle: string }>("salidas.php", "POST", d);

/* ------------------------- Usuarios (usuarios.php) ------------------------- */

type UsuarioDb = { idUsuario: number; nombreCompleto: string; username: string; emailUsuario: string; rolUsuario: Rol; estadoUsuario: "ACTIVO" | "INACTIVO" };
const aUsuario = (u: UsuarioDb): Usuario => ({
  id: Number(u.idUsuario),
  nombre: u.nombreCompleto,
  usuario: u.username,
  email: u.emailUsuario,
  rol: u.rolUsuario,
  activo: u.estadoUsuario === "ACTIVO",
});

export type SolicitudClave = { idUsuario: number; usuario: string; fecha: string };

export async function obtenerUsuarios(): Promise<{ usuarios: Usuario[]; solicitudes: SolicitudClave[] }> {
  const r = await pedir<{ usuarios: UsuarioDb[]; solicitudes: { idUsuario: number; username: string; fecha: string }[] }>("usuarios.php");
  return {
    usuarios: r.usuarios.map(aUsuario),
    solicitudes: r.solicitudes.map((s) => ({ idUsuario: Number(s.idUsuario), usuario: s.username, fecha: fechaDeMysql(s.fecha) })),
  };
}
/** RNF-04 */
export const crearUsuario = (d: { nombreCompleto: string; username: string; emailUsuario: string; password: string; rolUsuario: Rol }) =>
  pedir<{ idUsuario: number }>("usuarios.php", "POST", d);
/** RNF-06 (y RNF-09 paso 5 cuando trae passwordNueva) */
export const editarUsuario = (d: { idUsuario: number; nombreCompleto: string; emailUsuario: string; rolUsuario: Rol; passwordNueva: string }) =>
  pedir<{ cambioRol: boolean }>("usuarios.php", "PUT", d);
/** RNF-08 */
export const cambiarEstadoUsuario = (idUsuario: number, activo: boolean) =>
  pedir("usuarios.php", "PATCH", { idUsuario, estadoUsuario: activo ? "ACTIVO" : "INACTIVO" });
/** RNF-07 */
export const eliminarUsuario = (idUsuario: number) => pedir(`usuarios.php?idUsuario=${idUsuario}`, "DELETE");

/* ------------------------- Reportes (reportes.php) ------------------------- */

export type Consumo = { idInsumo: string; nombre: string; unidad: string; total: number };
/** RF-11 */
export async function obtenerConsumo(periodo: "semana" | "mes"): Promise<Consumo[]> {
  const r = await pedir<{ consumo: { idInsumo: string; nombreInsumo: string; unidad: string; total: string | number }[] }>(
    `reportes.php?tipo=consumo&periodo=${periodo}`,
  );
  return r.consumo.map((c) => ({ idInsumo: c.idInsumo, nombre: c.nombreInsumo, unidad: c.unidad, total: Number(c.total) }));
}

export type RenglonCompra = {
  codigo: string;
  insumo: string;
  categoria: string;
  marca: string;
  existencia: number;
  minimo: number;
  unidad: string;
  estado: "SIN EXISTENCIA" | "POR ACABARSE";
};
/** RF-12 */
export async function obtenerListaCompras(): Promise<RenglonCompra[]> {
  const r = await pedir<{
    lista: { idInsumo: string; nombreInsumo: string; nombreCategoria: string; nombreMarca: string; stockActual: string; stockMinimo: string; unidad: string; estadoAlerta: RenglonCompra["estado"] }[];
  }>("reportes.php?tipo=lista_compras");
  return r.lista.map((i) => ({
    codigo: i.idInsumo,
    insumo: i.nombreInsumo,
    categoria: i.nombreCategoria,
    marca: i.nombreMarca,
    existencia: Number(i.stockActual),
    minimo: Number(i.stockMinimo),
    unidad: i.unidad,
    estado: i.estadoAlerta,
  }));
}

/** RF-13 */
export async function obtenerBitacora(): Promise<Movimiento[]> {
  const r = await pedir<{
    bitacora: { idBitacora: number; fecha_HoraAccion: string; username: string; tipoAccion: Movimiento["accion"]; modulo: Movimiento["modulo"]; detalleAccion: string }[];
  }>("reportes.php?tipo=bitacora");
  return r.bitacora.map((b) => ({
    id: Number(b.idBitacora),
    fecha: fechaDeMysql(b.fecha_HoraAccion),
    usuario: b.username,
    accion: b.tipoAccion,
    modulo: b.modulo,
    detalle: b.detalleAccion,
  }));
}

/* ------------------------- Hook para cargar datos ------------------------- */

/**
 * Carga datos del servidor al abrir una pantalla.
 * Devuelve los datos, si está cargando, el error (si hubo) y `recargar` para pedirlos otra vez
 * después de guardar algo.
 */
export function useDatos<T>(cargar: () => Promise<T>, dependencias: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await cargar());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, error, recargar };
}
