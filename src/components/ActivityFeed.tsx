import { useState } from 'react'
import type { ActivityEvent, ActivityEventType } from '../types'

const EVENT_CONFIG: Record<
  ActivityEventType,
  { icon: string; color: string; label: string }
> = {
  done: { icon: '✓', color: '#34d399', label: 'Done' },
  blocked: { icon: '⚠', color: '#f59e0b', label: 'Blocked' },
  assigned: { icon: '→', color: '#818cf8', label: 'Assigned' },
  error: { icon: '✗', color: '#f87171', label: 'Error' },
}

const ROLE_COLORS: Record<string, string> = {
  ceo: '#f59e0b',
  cto: '#6366f1',
  cmo: '#ec4899',
  engineer: '#22d3ee',
  designer: '#a78bfa',
  default: '#34d399',
}

type FilterType = 'all' | ActivityEventType

function getDateLabel(ts: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
  events: ActivityEvent[]
  isRefreshing?: boolean
}

export function ActivityFeed({ events, isRefreshing }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  const FILTER_OPTIONS: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'done', label: 'Done' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'error', label: 'Error' },
  ]

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter)

  // Group by date label
  const grouped: { label: string; events: ActivityEvent[] }[] = []
  for (const evt of filtered) {
    const label = getDateLabel(evt.timestamp)
    const existing = grouped.find((g) => g.label === label)
    if (existing) {
      existing.events.push(evt)
    } else {
      grouped.push({ label, events: [evt] })
    }
  }

  return (
    <div className="glass-card rounded-xl flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 pt-3 pb-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="font-semibold"
          style={{ fontSize: '0.8rem', color: '#e2e8f0', letterSpacing: '0.02em' }}
        >
          Activity
        </span>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--active)' }}
            />
          )}

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded transition-colors duration-100"
              style={{
                backgroundColor: filterOpen
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#94a3b8',
                fontSize: '0.7rem',
              }}
            >
              {filter === 'all' ? 'Filter' : FILTER_OPTIONS.find((f) => f.id === filter)?.label}
              <svg
                style={{ transform: filterOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
              >
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {filterOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-20 animate-fade-in"
                style={{
                  backgroundColor: '#1e2535',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  minWidth: '110px',
                }}
              >
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setFilter(opt.id)
                      setFilterOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 transition-colors duration-100"
                    style={{
                      fontSize: '0.75rem',
                      color: filter === opt.id ? '#e2e8f0' : '#94a3b8',
                      backgroundColor:
                        filter === opt.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor =
                        'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor =
                        filter === opt.id ? 'rgba(255,255,255,0.06)' : 'transparent'
                    }}
                  >
                    {opt.id !== 'all' && (
                      <span
                        className="mr-1.5"
                        style={{ color: EVENT_CONFIG[opt.id as ActivityEventType]?.color }}
                      >
                        {EVENT_CONFIG[opt.id as ActivityEventType]?.icon}
                      </span>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div
            className="flex items-center justify-center py-10"
            style={{ color: '#334155', fontSize: '0.75rem' }}
          >
            No activity
          </div>
        ) : (
          <div className="space-y-0">
            {grouped.map((group, gi) => (
              <div key={group.label}>
                {/* Time divider */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                  <span
                    style={{ fontSize: '0.6rem', color: '#334155', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                  >
                    {group.label}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {group.events.map((evt, ei) => {
                    const cfg = EVENT_CONFIG[evt.type]
                    const agentColor = evt.agentRole
                      ? ROLE_COLORS[evt.agentRole] ?? ROLE_COLORS.default
                      : '#94a3b8'
                    const initials = evt.agentName ? getInitials(evt.agentName) : '??'

                    return (
                      <div
                        key={evt.id}
                        className="flex items-start gap-2.5 p-2 rounded-lg activity-item-enter"
                        style={{
                          animationDelay: `${gi * 0.02 + ei * 0.03}s`,
                          backgroundColor: 'rgba(255,255,255,0.01)',
                        }}
                      >
                        {/* Event type icon */}
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                          style={{
                            backgroundColor: cfg.color + '18',
                            color: cfg.color,
                            fontSize: '0.55rem',
                            fontWeight: 700,
                          }}
                        >
                          {cfg.icon}
                        </div>

                        {/* Agent avatar */}
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                          style={{
                            backgroundColor: agentColor + '22',
                            border: `1.5px solid ${agentColor}`,
                            color: agentColor,
                            fontSize: '0.5rem',
                            fontWeight: 700,
                          }}
                          title={evt.agentName}
                        >
                          {initials}
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <span
                            className="font-medium"
                            style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                          >
                            {evt.agentName ?? 'Unknown'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                            {' '}
                            {evt.type === 'done' && 'completed'}
                            {evt.type === 'blocked' && 'blocked on'}
                            {evt.type === 'assigned' && 'started'}
                            {evt.type === 'error' && 'errored on'}
                          </span>
                          <span
                            className="mono ml-1"
                            style={{ fontSize: '0.65rem', color: '#64748b' }}
                          >
                            {evt.issueIdentifier}
                          </span>
                          <div
                            className="truncate mt-0.5"
                            style={{ fontSize: '0.7rem', color: '#475569' }}
                            title={evt.issueTitle}
                          >
                            {evt.issueTitle}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <span
                          className="flex-shrink-0 tabular mt-0.5"
                          style={{ fontSize: '0.6rem', color: '#334155' }}
                          title={new Date(evt.timestamp).toISOString()}
                        >
                          {getRelativeTime(evt.timestamp)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
