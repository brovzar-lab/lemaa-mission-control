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

// Write operations always go through the proxy so PAPERCLIP_WRITE_API_KEY never reaches the browser.
export async function patchIssue(issueId: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/api/issues/${issueId}`)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function postComment(issueId: string, commentBody: string): Promise<void> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/api/issues/${issueId}/comments`)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: commentBody }),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function createIssue(companyId: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/api/companies/${companyId}/issues`)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
