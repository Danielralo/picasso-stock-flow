import { describe, expect, it } from "vitest";
import { construirPayloadTicket } from "./reabastecimiento-api";

describe("construirPayloadTicket", () => {
  it("solo incluye insumos con cantidad mayor a 0", () => {
    expect(construirPayloadTicket({ thinner: 2.5, barniz: 0, lija: 10 })).toEqual([
      { id_insumo: "thinner", cantidad_agregada: 2.5 },
      { id_insumo: "lija", cantidad_agregada: 10 },
    ]);
  });
});
