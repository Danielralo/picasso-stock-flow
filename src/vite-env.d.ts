/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dirección de la API en PHP. En XAMPP es «./api»; con `npm run dev` es «/picasso/api» (ver .env.development). */
  readonly VITE_API_URL?: string;
}
