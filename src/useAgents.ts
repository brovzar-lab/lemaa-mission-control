import { useQuery } from '@tanstack/react-query'
import { API_URL, API_KEY, COMPANY_ID, POLL_INTERVAL_MS, isDemoMode } from './config'
import { DEMO_AGENTS } from './demoData'
import type { Agent } from './types'

interface IssueRef {
  id: string
  identifier: string
  title: string
  assigneeAgentId: string | null
  activeRun: { id: string; status: string; startedAt: string } | null
}

async function fetchAgents(): Promise<Agent[]> {
  const [agentsRes, issuesRes] = await Promise.all([
    fetch(`${API_URL}/api/companies/${COMPANY_ID}/agents`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }),
    fetch(`${API_URL}/api/companies/${COMPANY_ID}/issues?status=in_progress`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }),
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

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: isDemoMode ? () => Promise.resolve(DEMO_AGENTS) : fetchAgents,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  })
}
