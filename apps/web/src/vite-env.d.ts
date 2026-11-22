/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SURREAL_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
