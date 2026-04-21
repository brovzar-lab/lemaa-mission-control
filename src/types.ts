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
