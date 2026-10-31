/*
 * main.tsx — Punto de entrada de la versión que se publica en XAMPP (http://localhost/picasso).
 * Es una página normal (sin servidor de Node): Apache entrega index.html y los archivos de assets/,
 * y las pantallas hablan con la API en PHP de la carpeta api/.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/components/picasso/App";
import { Toaster } from "@/components/ui/sonner";
import "../src/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Toaster richColors position="top-center" />
  </StrictMode>,
);
