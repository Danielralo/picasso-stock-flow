import { useState } from "react";

/** Insumos mostrados por página en las vistas de Reabastecer y Entregar. */
export const POR_PAGINA = 10;

export function totalPaginasDe(total: number): number {
  return Math.max(1, Math.ceil(total / POR_PAGINA));
}

export function visiblesDe<T>(items: T[], pagina: number): T[] {
  const p = Math.min(Math.max(1, pagina), totalPaginasDe(items.length));
  return items.slice((p - 1) * POR_PAGINA, p * POR_PAGINA);
}

/** Pagina una lista: devuelve la página actual (acotada), el setter y los items visibles. */
export function usePagina<T>(items: T[]): { pagina: number; setPagina: (p: number) => void; visibles: T[]; totalPaginas: number } {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = totalPaginasDe(items.length);
  const actual = Math.min(pagina, totalPaginas);
  const visibles = visiblesDe(items, actual);
  return { pagina: actual, setPagina, visibles, totalPaginas };
}
