export const isDemoMode =
  !import.meta.env.VITE_PAPERCLIP_API_KEY ||
  import.meta.env.VITE_PAPERCLIP_API_KEY === 'REPLACE_WITH_VALUE'

export const API_URL = import.meta.env.VITE_PAPERCLIP_API_URL ?? ''
export const API_KEY = import.meta.env.VITE_PAPERCLIP_API_KEY ?? ''
export const COMPANY_ID = import.meta.env.VITE_PAPERCLIP_COMPANY_ID ?? ''
export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 5000)
