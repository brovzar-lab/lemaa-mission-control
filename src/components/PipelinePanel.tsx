import { useState } from 'react'
import type { Issue, Agent } from '../types'
import { TaskRow } from './TaskRow'

type Tab = 'in_progress' | 'blocked' | 'in_review'

const TABS: { id: Tab; label: string }[] = [
  { id: 'in_progress', label: 'In Progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'in_review', label: 'In Review' },
]

interface Props {
  issues: Issue[]
  agents: Agent[]
  isRefreshing?: boolean
}

export function PipelinePanel({ issues, agents, isRefreshing }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('in_progress')

  const counts = {
    in_progress: issues.filter((i) => i.status === 'in_progress').length,
    blocked: issues.filter((i) => i.status === 'blocked').length,
    in_review: issues.filter((i) => i.status === 'in_review').length,
  }

  const visible = issues.filter((i) => i.status === activeTab)

  return (
    <div className="glass-card rounded-xl flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 pt-3 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span
            className="font-semibold tracking-wide"
            style={{ fontSize: '0.8rem', color: '#e2e8f0', letterSpacing: '0.02em' }}
          >
            Pipeline
          </span>
          <span
            className="mono"
            style={{ fontSize: '0.6rem', color: '#475569' }}
          >
            {issues.length} tasks
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const count = counts[tab.id]
            const isBlockedTab = tab.id === 'blocked'
            const hasBlockers = isBlockedTab && count > 0

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-colors duration-150 relative"
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.06)'
                    : 'transparent',
                  color: isActive ? '#e2e8f0' : '#64748b',
                  borderBottom: isActive
                    ? '2px solid var(--active)'
                    : '2px solid transparent',
                  fontSize: '0.75rem',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}

                {/* Count badge */}
                <span
                  className="px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: isActive
                      ? hasBlockers
                        ? 'rgba(245,158,11,0.2)'
                        : 'rgba(34,211,238,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    color: isActive
                      ? hasBlockers
                        ? '#f59e0b'
                        : '#22d3ee'
                      : '#475569',
                    fontSize: '0.6rem',
                    lineHeight: '1',
                  }}
                >
                  {count}
                </span>

                {/* Red dot for blocked tab when count > 0 */}
                {hasBlockers && (
                  <span
                    className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: '#f87171' }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isRefreshing && visible.length > 0 && (
          <div
            className="h-1 rounded-full skeleton mb-2"
            style={{ backgroundColor: 'transparent' }}
          />
        )}

        {visible.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-10 gap-2"
            style={{ color: '#334155' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect
                x="4"
                y="4"
                width="24"
                height="24"
                rx="4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <path
                d="M11 16h10M16 11v10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span style={{ fontSize: '0.75rem' }}>No {TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} tasks</span>
          </div>
        ) : (
          visible.map((issue) => (
            <TaskRow
              key={issue.id}
              issue={issue}
              agents={agents}
              isRefreshing={isRefreshing}
            />
          ))
        )}
      </div>
    </div>
  )
}
