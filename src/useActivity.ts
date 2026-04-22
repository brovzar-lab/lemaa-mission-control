import { useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS, isDemoMode } from './config'
import { apiUrl, apiHeaders } from './api'
import { DEMO_ACTIVITY } from './demoData'
import type { ActivityEvent, Issue } from './types'

function issueToEvent(issue: Issue): ActivityEvent {
  const type: ActivityEvent['type'] =
    issue.status === 'done' ? 'done' : issue.status === 'blocked' ? 'blocked' : 'assigned'

  return {
    id: issue.id,
    type,
    agentId: issue.assigneeAgentId,
    issueIdentifier: issue.identifier,
    issueTitle: issue.title,
    timestamp: issue.updatedAt,
  }
}

async function fetchActivity(companyId: string): Promise<ActivityEvent[]> {
  const res = await fetch(
    apiUrl(`/api/companies/${companyId}/issues?status=done,blocked,in_progress`),
    { headers: apiHeaders() },
  )
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`)
  const issues: Issue[] = await res.json()
  return issues
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30)
    .map(issueToEvent)
}

export function useActivity(companyId: string) {
  return useQuery<ActivityEvent[]>({
    queryKey: ['activity', companyId],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_ACTIVITY) : () => fetchActivity(companyId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    enabled: !!companyId,
  })
}
