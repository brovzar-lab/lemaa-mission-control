import { useQuery } from '@tanstack/react-query'
import { API_URL, API_KEY, COMPANY_ID, POLL_INTERVAL_MS, isDemoMode } from './config'
import { DEMO_AGENTS } from './demoData'
import type { Agent } from './types'

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_URL}/api/companies/${COMPANY_ID}/agents`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.status}`)
  return res.json() as Promise<Agent[]>
}

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_AGENTS) : fetchAgents,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
