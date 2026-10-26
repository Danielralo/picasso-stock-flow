import { describe, expect, it } from "vitest";
import { POR_PAGINA, totalPaginasDe, visiblesDe } from "./paginacion";

describe("paginación de insumos", () => {
  it("usa 10 insumos por página", () => {
    expect(POR_PAGINA).toBe(10);
  });

  it("20 lijas ocupan 2 páginas", () => {
    expect(totalPaginasDe(20)).toBe(2);
  });

  it("con 7 insumos hay 1 página", () => {
    expect(totalPaginasDe(7)).toBe(1);
  });

  it("la página 1 de 20 items muestra los primeros 10", () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(visiblesDe(items, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("la página 2 de 20 items muestra los últimos 10", () => {
    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(visiblesDe(items, 2)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("acota la página si el filtro reduce la lista", () => {
    const items = Array.from({ length: 12 }, (_, i) => i + 1);
    expect(visiblesDe(items, 5).length).toBeGreaterThan(0);
    expect(visiblesDe(items, 5)).toEqual([11, 12]);
  });
});
