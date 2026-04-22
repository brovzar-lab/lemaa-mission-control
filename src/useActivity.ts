import { useQuery } from '@tanstack/react-query'
import { API_URL, API_KEY, COMPANY_ID, POLL_INTERVAL_MS, isDemoMode } from './config'
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

async function fetchActivity(): Promise<ActivityEvent[]> {
  const res = await fetch(
    `${API_URL}/api/companies/${COMPANY_ID}/issues?status=done,blocked,in_progress`,
    { headers: { Authorization: `Bearer ${API_KEY}` } },
  )
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`)
  const issues: Issue[] = await res.json()
  return issues
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 30)
    .map(issueToEvent)
}

export function useActivity() {
  return useQuery<ActivityEvent[]>({
    queryKey: ['activity'],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_ACTIVITY) : fetchActivity,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
