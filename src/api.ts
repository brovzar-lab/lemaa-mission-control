// Returns the URL to use for an API path.
// In production (Vercel), all calls go through the serverless proxy to avoid CORS.
// In dev with VITE_PAPERCLIP_API_URL set, calls go directly to the upstream API.
export function apiUrl(path: string): string {
  if (import.meta.env.DEV && import.meta.env.VITE_PAPERCLIP_API_URL) {
    return `${import.meta.env.VITE_PAPERCLIP_API_URL}${path}`
  }
  return `/api/proxy?path=${encodeURIComponent(path)}`
}

export function apiHeaders(): HeadersInit {
  if (import.meta.env.DEV && import.meta.env.VITE_PAPERCLIP_API_KEY) {
    return { Authorization: `Bearer ${import.meta.env.VITE_PAPERCLIP_API_KEY}` }
  }
  return {}
}
