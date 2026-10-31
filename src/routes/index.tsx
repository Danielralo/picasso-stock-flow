import { createFileRoute } from "@tanstack/react-router";
import { App } from "@/components/picasso/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Picasso Autosport — Inventario del taller" },
      {
        name: "description",
        content:
          "Control de insumos, entregas, usuarios y bitácora para el taller de hojalatería y pintura Picasso Autosport.",
      },
      { property: "og:title", content: "Picasso Autosport — Inventario del taller" },
      {
        property: "og:description",
        content: "Control de insumos, entregas, usuarios y bitácora del taller Picasso Autosport.",
      },
    ],
  }),
  component: App,
});
