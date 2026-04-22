const UPSTREAM = process.env.PAPERCLIP_API_URL ?? 'https://paperclip.billyrovzar.com'
const API_KEY = process.env.PAPERCLIP_API_KEY ?? ''

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.status(204).end()
    return
  }

  const path = typeof req.query?.path === 'string' ? req.query.path : ''
  if (!path || !path.startsWith('/api/')) {
    res.status(400).json({ error: 'invalid path' })
    return
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const text = await upstream.text()
    res.status(upstream.status)
      .setHeader('Content-Type', 'application/json')
      .send(text)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}
