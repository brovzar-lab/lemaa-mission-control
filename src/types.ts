export interface ActiveRun {
  id: string
  status: string
  startedAt: string
}

export interface Agent {
  id: string
  name: string
  title: string | null
  role: string
  icon: string | null
  status: string
  activeRun: ActiveRun | null
  urlKey: string | null
  currentIssue?: { identifier: string; title: string }
}

export interface BlockerRef {
  id: string
  identifier: string
  title: string
  status: string
}

export interface Issue {
  id: string
  identifier: string
  title: string
  description?: string
  status: string
  priority: string
  assigneeAgentId: string | null
  blockedBy?: BlockerRef[]
  updatedAt: string
  startedAt?: string | null
}

export type ActivityEventType = 'done' | 'blocked' | 'assigned' | 'error'

export interface ActivityEvent {
  id: string
  type: ActivityEventType
  agentId: string | null
  agentName?: string
  agentRole?: string
  issueIdentifier: string
  issueTitle: string
  timestamp: string
}
