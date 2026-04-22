import { useEffect, useCallback, useRef } from 'react'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import type { Agent, Issue } from '../types'

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

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#22d3ee',
  blocked: '#f59e0b',
  in_review: '#818cf8',
  todo: '#475569',
  done: '#34d399',
}

const RECENTLY_VIEWED_KEY = 'mc_recently_viewed'
const MAX_RECENT = 5

type RecentItem = { id: string; label: string; sub: string; type: 'agent' | 'task' }

function loadRecent(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(item: RecentItem): void {
  const existing = loadRecent().filter((r) => r.id !== item.id)
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([item, ...existing].slice(0, MAX_RECENT)))
}

interface Props {
  open: boolean
  agents: Agent[]
  pipelineIssues: Issue[]
  onClose: () => void
  onSelectAgent: (agentId: string) => void
}

export function CommandPalette({ open, agents, pipelineIssues, onClose, onSelectAgent }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const recentItems = loadRecent()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelectAgent = useCallback(
    (agent: Agent) => {
      saveRecent({ id: agent.id, label: agent.name, sub: agent.title ?? agent.role, type: 'agent' })
      onSelectAgent(agent.id)
      onClose()
    },
    [onSelectAgent, onClose],
  )

  const handleSelectIssue = useCallback(
    (issue: Issue) => {
      saveRecent({ id: issue.id, label: issue.identifier, sub: issue.title, type: 'task' })
      onClose()
    },
    [onClose],
  )

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ zIndex: 60, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />

          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2"
            style={{
              zIndex: 70,
              top: '20%',
              transform: 'translateX(-50%)',
              width: '540px',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <Command
              className="rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30,37,53,0.98), rgba(13,17,23,0.99))',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(129,140,248,0.15)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span style={{ color: '#475569', fontSize: '0.875rem' }}>⌘</span>
                <Command.Input
                  ref={inputRef}
                  placeholder="Search agents, tasks…"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
                <button
                  onClick={onClose}
                  className="pixel-text"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#475569',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.5rem',
                  }}
                >
                  ESC
                </button>
              </div>

              <Command.List
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  padding: '8px',
                }}
              >
                <Command.Empty>
                  <div
                    className="pixel-text text-center py-8"
                    style={{ fontSize: '0.55rem', color: '#1e293b' }}
                  >
                    NO RESULTS FOUND
                  </div>
                </Command.Empty>

                {recentItems.length > 0 && (
                  <Command.Group heading="Recent">
                    {recentItems.map((item) => (
                      <Command.Item
                        key={`recent-${item.id}`}
                        value={`recent ${item.label} ${item.sub}`}
                        onSelect={() => {
                          if (item.type === 'agent') {
                            onSelectAgent(item.id)
                          }
                          onClose()
                        }}
                        style={{ borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#334155' }}>↺</span>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.label}</div>
                            <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#334155' }}>
                              {item.sub}
                            </div>
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Agents">
                  {agents.map((agent) => {
                    const color = getColor(agent.role)
                    return (
                      <Command.Item
                        key={agent.id}
                        value={`agent ${agent.name} ${agent.title ?? ''} ${agent.role}`}
                        onSelect={() => handleSelectAgent(agent)}
                        style={{ borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '4px',
                              backgroundColor: color + '22',
                              border: `1px solid ${color}55`,
                              color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(agent.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{agent.name}</div>
                            {agent.title && (
                              <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#475569' }}>
                                {agent.title}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: agent.activeRun ? 'var(--active)' : 'var(--idle)',
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      </Command.Item>
                    )
                  })}
                </Command.Group>

                {pipelineIssues.length > 0 && (
                  <Command.Group heading="Active Tasks">
                    {pipelineIssues.map((issue) => (
                      <Command.Item
                        key={issue.id}
                        value={`task ${issue.identifier} ${issue.title}`}
                        onSelect={() => handleSelectIssue(issue)}
                        style={{ borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            className="pixel-text"
                            style={{
                              width: '52px',
                              fontSize: '0.45rem',
                              color: STATUS_COLORS[issue.status] ?? '#475569',
                              flexShrink: 0,
                            }}
                          >
                            {issue.identifier}
                          </div>
                          <div
                            style={{ fontSize: '0.75rem', color: '#94a3b8', flex: 1, minWidth: 0 }}
                            className="truncate"
                          >
                            {issue.title}
                          </div>
                          <div
                            className="pixel-text px-1.5 py-0.5 rounded-sm"
                            style={{
                              fontSize: '0.4rem',
                              backgroundColor: (STATUS_COLORS[issue.status] ?? '#475569') + '22',
                              color: STATUS_COLORS[issue.status] ?? '#475569',
                              flexShrink: 0,
                            }}
                          >
                            {issue.status.replace('_', ' ')}
                          </div>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
