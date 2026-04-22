import { useQuery } from '@tanstack/react-query'
import { API_URL, API_KEY, COMPANY_ID, POLL_INTERVAL_MS, isDemoMode } from './config'
import { DEMO_PIPELINE_ISSUES } from './demoData'
import type { Issue } from './types'

async function fetchPipelineIssues(): Promise<Issue[]> {
  const res = await fetch(
    `${API_URL}/api/companies/${COMPANY_ID}/issues?status=in_progress,blocked,in_review`,
    { headers: { Authorization: `Bearer ${API_KEY}` } },
  )
  if (!res.ok) throw new Error(`Failed to fetch pipeline issues: ${res.status}`)
  return res.json()
}

export function usePipelineIssues() {
  return useQuery<Issue[]>({
    queryKey: ['pipeline-issues'],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_PIPELINE_ISSUES) : fetchPipelineIssues,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
