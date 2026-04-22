import { useQuery } from '@tanstack/react-query'
import { POLL_INTERVAL_MS, isDemoMode } from './config'
import { apiUrl, apiHeaders } from './api'
import { DEMO_AGENTS } from './demoData'
import type { Agent } from './types'

interface IssueRef {
  id: string
  identifier: string
  title: string
  assigneeAgentId: string | null
  activeRun: { id: string; status: string; startedAt: string } | null
}

async function fetchAgents(companyId: string): Promise<Agent[]> {
  const [agentsRes, issuesRes] = await Promise.all([
    fetch(apiUrl(`/api/companies/${companyId}/agents`), { headers: apiHeaders() }),
    fetch(apiUrl(`/api/companies/${companyId}/issues?status=in_progress`), { headers: apiHeaders() }),
  ])
  if (!agentsRes.ok) throw new Error(`Failed to fetch agents: ${agentsRes.status}`)
  if (!issuesRes.ok) throw new Error(`Failed to fetch issues: ${issuesRes.status}`)

  const agents = (await agentsRes.json()) as Agent[]
  const issues = (await issuesRes.json()) as IssueRef[]

  const issueByAgentId = new Map<string, IssueRef>()
  for (const issue of issues) {
    if (issue.assigneeAgentId) {
      issueByAgentId.set(issue.assigneeAgentId, issue)
    }
  }

  return agents.map((agent) => {
    const issue = issueByAgentId.get(agent.id)
    return issue
      ? { ...agent, currentIssue: { identifier: issue.identifier, title: issue.title }, activeRun: issue.activeRun }
      : agent
  })
}

export function useAgents(companyId: string) {
  return useQuery<Agent[]>({
    queryKey: ['agents', companyId],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_AGENTS) : () => fetchAgents(companyId),
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    enabled: !!companyId,
  })
}
