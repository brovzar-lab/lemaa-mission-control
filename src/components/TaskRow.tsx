import { useState } from 'react'
import type { Issue, Agent } from '../types'

const PRIORITY_CHIP: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'rgba(248,113,113,0.2)', text: '#f87171', label: 'CRITICAL' },
  high: { bg: 'rgba(249,115,22,0.2)', text: '#f97316', label: 'HIGH' },
  medium: { bg: 'rgba(245,158,11,0.2)', text: '#f59e0b', label: 'MED' },
  low: { bg: 'rgba(100,116,139,0.2)', text: '#94a3b8', label: 'LOW' },
}

const ROLE_COLORS: Record<string, string> = {
  ceo: '#f59e0b',
  cto: '#6366f1',
  cmo: '#ec4899',
  engineer: '#22d3ee',
  designer: '#a78bfa',
  default: '#34d399',
}

function getRelativeTime(ts: string): string {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface Props {
  issue: Issue
  agents: Agent[]
  isRefreshing?: boolean
}

export function TaskRow({ issue, agents, isRefreshing }: Props) {
  const [expanded, setExpanded] = useState(false)

  const agent = agents.find((a) => a.id === issue.assigneeAgentId)
  const isBlocked = issue.status === 'blocked'
  const blockerCount = issue.blockedBy?.length ?? 0
  const chip = PRIORITY_CHIP[issue.priority] ?? PRIORITY_CHIP.low
  const agentColor = agent ? (ROLE_COLORS[agent.role] ?? ROLE_COLORS.default) : '#94a3b8'
  const initials = agent ? getInitials(agent.name) : '??'
  const relTime = getRelativeTime(issue.updatedAt)
  const isoTime = new Date(issue.updatedAt).toISOString()

  return (
    <div
      className={`rounded-lg cursor-pointer transition-all duration-150 select-none ${
        isBlocked ? 'blocked-shimmer' : ''
      } ${isRefreshing ? 'opacity-60' : ''}`}
      style={{
        backgroundColor: isBlocked ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
        borderLeft: isBlocked ? '3px solid var(--paused)' : '3px solid transparent',
        border: isBlocked
          ? '1px solid rgba(245,158,11,0.15)'
          : '1px solid rgba(255,255,255,0.06)',
        borderLeftWidth: '3px',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Agent avatar */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: agentColor + '22',
            border: `2px solid ${agentColor}`,
            color: agentColor,
            fontSize: '0.6rem',
          }}
          title={agent?.name}
        >
          {initials}
        </div>

        {/* Title + identifier */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="mono flex-shrink-0"
              style={{ fontSize: '0.65rem', color: '#64748b' }}
            >
              {issue.identifier}
            </span>
            {isBlocked && blockerCount > 0 && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium animate-amber-pulse"
                style={{
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#f59e0b',
                  fontSize: '0.6rem',
                }}
              >
                Blocked by {blockerCount}
              </span>
            )}
          </div>
          <div
            className="truncate font-medium"
            style={{ fontSize: '0.8rem', color: '#cbd5e1' }}
          >
            {issue.title}
          </div>
        </div>

        {/* Right meta */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Priority badge */}
          <span
            className="px-1.5 py-0.5 rounded font-semibold"
            style={{
              backgroundColor: chip.bg,
              color: chip.text,
              fontSize: '0.55rem',
              letterSpacing: '0.05em',
            }}
          >
            {chip.label}
          </span>

          {/* Relative timestamp */}
          <span
            className="tabular hidden sm:block"
            style={{ fontSize: '0.65rem', color: '#475569' }}
            title={isoTime}
          >
            {relTime}
          </span>

          {/* Expand chevron */}
          <svg
            className="flex-shrink-0 transition-transform duration-200"
            style={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              color: '#475569',
            }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Accordion content */}
      {expanded && (
        <div
          className="px-3 pb-3 animate-fade-in"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          {agent && (
            <div className="flex items-center gap-1.5 mt-2 mb-2">
              <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Assigned to</span>
              <span style={{ fontSize: '0.65rem', color: agentColor, fontWeight: 500 }}>
                {agent.name}
              </span>
              {agent.title && (
                <span style={{ fontSize: '0.6rem', color: '#475569' }}>· {agent.title}</span>
              )}
            </div>
          )}

          {issue.description && (
            <p
              className="leading-relaxed mb-2"
              style={{ fontSize: '0.75rem', color: '#94a3b8' }}
            >
              {issue.description.length > 200
                ? issue.description.slice(0, 200) + '…'
                : issue.description}
            </p>
          )}

          {isBlocked && issue.blockedBy && issue.blockedBy.length > 0 && (
            <div className="mt-2">
              <div
                className="mb-1"
                style={{ fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}
              >
                Blocked by:
              </div>
              <div className="flex flex-wrap gap-1">
                {issue.blockedBy.map((b) => (
                  <span
                    key={b.id}
                    className="px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      color: '#f59e0b',
                      fontSize: '0.65rem',
                    }}
                  >
                    {b.identifier}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className="mt-2 tabular"
            style={{ fontSize: '0.6rem', color: '#475569' }}
            title={isoTime}
          >
            Updated {isoTime}
          </div>
        </div>
      )}
    </div>
  )
}
