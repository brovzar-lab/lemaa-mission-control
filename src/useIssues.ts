import { useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS, isDemoMode } from './config'
import { apiUrl, apiHeaders } from './api'
import { DEMO_PIPELINE_ISSUES } from './demoData'
import type { Issue } from './types'

async function fetchPipelineIssues(companyId: string): Promise<Issue[]> {
  const res = await fetch(
    apiUrl(`/api/companies/${companyId}/issues?status=in_progress,blocked,in_review`),
    { headers: apiHeaders() },
  )
  if (!res.ok) throw new Error(`Failed to fetch pipeline issues: ${res.status}`)
  return res.json()
}

export function usePipelineIssues(companyId: string) {
  return useQuery<Issue[]>({
    queryKey: ['pipeline-issues', companyId],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_PIPELINE_ISSUES) : () => fetchPipelineIssues(companyId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    enabled: !!companyId,
  })
}
