const UPSTREAM = process.env.PAPERCLIP_API_URL ?? 'https://paperclip.billyrovzar.com'
const READ_KEY = process.env.PAPERCLIP_API_KEY ?? ''
const WRITE_KEY = process.env.PAPERCLIP_WRITE_API_KEY ?? ''

const WRITE_METHODS = new Set(['PATCH', 'POST', 'PUT', 'DELETE'])

const isWriteEndpoint = (path: string, method: string): boolean => {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false
  return (
    /^\/api\/issues\/[^/]+$/.test(path) ||
    /^\/api\/issues\/[^/]+\/comments$/.test(path) ||
    /^\/api\/companies\/[^/]+\/issues$/.test(path)
  )
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.status(204).end()
    return
  }

  const path = typeof req.query?.path === 'string' ? req.query.path : ''
  if (!path || !path.startsWith('/api/')) {
    res.status(400).json({ error: 'invalid path' })
    return
  }

  const method = req.method ?? 'GET'
  const useWriteKey = isWriteEndpoint(path, method)
  const apiKey = useWriteKey ? WRITE_KEY : READ_KEY

  if (useWriteKey && !WRITE_KEY) {
    res.status(503).json({ error: 'Write operations not configured' })
    return
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    }
    const upstream = await fetch(`${UPSTREAM}${path}`, fetchOptions)
    const text = await upstream.text()
    res
      .status(upstream.status)
      .setHeader('Content-Type', 'application/json')
      .send(text)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
