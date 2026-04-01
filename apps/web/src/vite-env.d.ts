/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="webworker" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origine du serveur Nest (ex. http://localhost:3001) — Socket.io + API. Vide = même origine (proxy Vite). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
