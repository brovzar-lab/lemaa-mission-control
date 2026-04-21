/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAPERCLIP_API_URL: string
  readonly VITE_PAPERCLIP_API_KEY: string
  readonly VITE_PAPERCLIP_COMPANY_ID: string
  readonly VITE_POLL_INTERVAL_MS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
