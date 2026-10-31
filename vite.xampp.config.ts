/*
 * vite.xampp.config.ts — Genera las pantallas que se copian a C:\xampp\htdocs\picasso.
 *
 *   npm run build:xampp   →   vuelve a crear la carpeta pantallas-compiladas/ (index.html + assets/)
 *
 * base: "./" hace que todas las rutas sean relativas, así funciona dentro de http://localhost/picasso/
 * Después instalar-en-xampp.bat copia pantallas-compiladas/ y servidor/ a XAMPP.
 */
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "spa",
  base: "./",
  publicDir: "../public",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: "../pantallas-compiladas",
    emptyOutDir: true,
  },
});
