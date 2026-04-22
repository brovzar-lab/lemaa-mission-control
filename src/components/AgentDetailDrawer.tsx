import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Agent, ActivityEvent } from '../types'

const ROLE_COLORS: Record<string, string> = {
  ceo: '#f59e0b',
  cto: '#6366f1',
  cmo: '#ec4899',
  engineer: '#22d3ee',
  designer: '#a78bfa',
  default: '#34d399',
}

function getColor(role: string): string {
  return ROLE_COLORS[role] ?? ROLE_COLORS.default
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatRunDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const EVENT_ICONS: Record<string, string> = {
  done: '✓',
  blocked: '⚠',
  assigned: '→',
  error: '✕',
}

const EVENT_COLORS: Record<string, string> = {
  done: '#34d399',
  blocked: '#f59e0b',
  assigned: '#818cf8',
  error: '#f87171',
}

interface Props {
  agent: Agent | null
  activityEvents: ActivityEvent[]
  onClose: () => void
}

export function AgentDetailDrawer({ agent, activityEvents, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const agentEvents = agent
    ? activityEvents
        .filter((e) => e.agentId === agent.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
    : []

  const doneCount = agentEvents.filter((e) => e.type === 'done').length
  const color = agent ? getColor(agent.role) : '#22d3ee'

  return (
    <AnimatePresence>
      {agent && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ zIndex: 40, backgroundColor: 'rgba(0,0,0,0.4)' }}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 flex flex-col"
            style={{
              width: '360px',
              zIndex: 50,
              background: 'linear-gradient(180deg, rgba(22,27,39,0.98) 0%, rgba(13,17,23,0.99) 100%)',
              borderLeft: `1px solid ${color}33`,
              boxShadow: `-8px 0 32px rgba(0,0,0,0.6), -1px 0 0 ${color}22`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-start justify-between p-5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center text-sm font-bold"
                  style={{
                    backgroundColor: color + '22',
                    border: `2px solid ${color}`,
                    color,
                  }}
                >
                  {getInitials(agent.name)}
                </div>
                <div>
                  <div className="font-semibold" style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
                    {agent.name}
                  </div>
                  {agent.title && (
                    <div className="pixel-text" style={{ fontSize: '0.55rem', color: '#475569', marginTop: '2px' }}>
                      {agent.title}
                    </div>
                  )}
                  <div
                    className="pixel-text mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
                    style={{
                      fontSize: '0.5rem',
                      backgroundColor: agent.activeRun ? 'rgba(34,211,238,0.1)' : 'rgba(148,163,184,0.08)',
                      border: `1px solid ${agent.activeRun ? 'rgba(34,211,238,0.3)' : 'rgba(148,163,184,0.2)'}`,
                      color: agent.activeRun ? 'var(--active)' : 'var(--idle)',
                    }}
                  >
                    <span
                      className={agent.activeRun ? 'animate-pulse' : ''}
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: agent.activeRun ? 'var(--active)' : 'var(--idle)',
                        display: 'inline-block',
                      }}
                    />
                    {agent.activeRun ? `RUNNING ${formatRunDuration(agent.activeRun.startedAt)}` : 'IDLE'}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                style={{
                  color: '#475569',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e2e8f0'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Current task */}
            {agent.currentIssue && (
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="pixel-text mb-2" style={{ fontSize: '0.5rem', color: '#334155' }}>
                  CURRENT TASK
                </div>
                <div
                  className="rounded p-3"
                  style={{
                    backgroundColor: 'rgba(34,211,238,0.05)',
                    border: '1px solid rgba(34,211,238,0.15)',
                  }}
                >
                  <div className="pixel-text mb-1" style={{ fontSize: '0.55rem', color: 'var(--active)' }}>
                    {agent.currentIssue.identifier}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {agent.currentIssue.title}
                  </div>
                </div>
              </div>
            )}

            {/* Performance metrics */}
            <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="pixel-text mb-3" style={{ fontSize: '0.5rem', color: '#334155' }}>
                PERFORMANCE (LAST 7 DAYS)
              </div>
              <div className="flex gap-4">
                <div
                  className="flex-1 rounded p-3 text-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="font-bold tabular"
                    style={{ fontSize: '1.25rem', color: '#34d399' }}
                  >
                    {agentEvents.filter((e) => e.type === 'done').length}
                  </div>
                  <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#475569', marginTop: '2px' }}>
                    TASKS DONE
                  </div>
                </div>
                <div
                  className="flex-1 rounded p-3 text-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="font-bold tabular"
                    style={{ fontSize: '1.25rem', color: '#f59e0b' }}
                  >
                    {agentEvents.filter((e) => e.type === 'blocked').length}
                  </div>
                  <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#475569', marginTop: '2px' }}>
                    BLOCKED
                  </div>
                </div>
                <div
                  className="flex-1 rounded p-3 text-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div
                    className="font-bold tabular"
                    style={{ fontSize: '1.25rem', color: color }}
                  >
                    {agentEvents.length}
                  </div>
                  <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#475569', marginTop: '2px' }}>
                    TOTAL EVENTS
                  </div>
                </div>
              </div>
              {doneCount > 0 && (
                <div
                  className="mt-2 rounded px-3 py-2"
                  style={{ backgroundColor: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}
                >
                  <span className="pixel-text" style={{ fontSize: '0.5rem', color: '#34d399' }}>
                    {doneCount} tasks completed in recent history
                  </span>
                </div>
              )}
            </div>

            {/* Task history */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
              <div className="pixel-text mb-3" style={{ fontSize: '0.5rem', color: '#334155' }}>
                RECENT ACTIVITY
              </div>
              {agentEvents.length === 0 ? (
                <div
                  className="rounded p-4 text-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="pixel-text" style={{ fontSize: '0.55rem', color: '#1e293b' }}>
                    NO RECENT ACTIVITY
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {agentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2.5 rounded p-2.5"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: EVENT_COLORS[event.type] + '22',
                          color: EVENT_COLORS[event.type],
                        }}
                      >
                        {EVENT_ICONS[event.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="truncate"
                          style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: '1.3' }}
                          title={event.issueTitle}
                        >
                          <span className="pixel-text" style={{ fontSize: '0.5rem', color: '#475569', marginRight: '4px' }}>
                            {event.issueIdentifier}
                          </span>
                          {event.issueTitle}
                        </div>
                        <div className="pixel-text mt-0.5" style={{ fontSize: '0.45rem', color: '#334155' }}>
                          {formatRelative(event.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
