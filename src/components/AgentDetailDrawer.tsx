import { useEffect, useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import type { Agent, ActivityEvent, Issue } from '../types'
import { patchIssue } from '../api'
import { toast } from '../useToast'

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

interface TaskSuggestion {
  id: string
  identifier: string
  title: string
}

interface Props {
  agent: Agent | null
  agents: Agent[]
  companyId: string
  activityEvents: ActivityEvent[]
  companyPrefix: string
  onClose: () => void
}

export function AgentDetailDrawer({ agent, agents, companyId, activityEvents, companyPrefix, onClose }: Props) {
  const queryClient = useQueryClient()
  const [showBlockedReason, setShowBlockedReason] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [showReassign, setShowReassign] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([])
  const [confirmStop, setConfirmStop] = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Reset local state when agent changes
  useEffect(() => {
    setShowBlockedReason(false)
    setBlockedReason('')
    setShowReassign(false)
    setTaskSearch('')
    setTaskSuggestions([])
    setConfirmStop(false)
  }, [agent?.id])

  const agentEvents = agent
    ? activityEvents
        .filter((e) => e.agentId === agent.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
    : []

  const doneCount = agentEvents.filter((e) => e.type === 'done').length
  const color = agent ? getColor(agent.role) : '#22d3ee'

  // Optimistic update helper — patches the pipeline-issues cache
  const optimisticUpdateIssue = useCallback(
    (issueId: string, update: Partial<Issue>) => {
      queryClient.setQueryData<Issue[]>(['pipeline-issues', companyId], (old) =>
        old?.map((i) => (i.id === issueId ? { ...i, ...update } : i)) ?? [],
      )
    },
    [queryClient, companyId],
  )

  const handleMarkDone = async () => {
    if (!agent?.currentIssue) return
    // Find issue in cache to get id
    const issues = queryClient.getQueryData<Issue[]>(['pipeline-issues', companyId]) ?? []
    const issue = issues.find((i) => i.identifier === agent.currentIssue!.identifier)
    if (!issue) return
    const prev = issue.status
    optimisticUpdateIssue(issue.id, { status: 'done' })
    try {
      await patchIssue(issue.id, { status: 'done' })
      toast.success('Task marked done')
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdateIssue(issue.id, { status: prev })
      toast.error('Failed to mark done', handleMarkDone)
    }
  }

  const handleMarkBlocked = async () => {
    if (!agent?.currentIssue || !blockedReason.trim()) return
    const issues = queryClient.getQueryData<Issue[]>(['pipeline-issues', companyId]) ?? []
    const issue = issues.find((i) => i.identifier === agent.currentIssue!.identifier)
    if (!issue) return
    const prev = issue.status
    optimisticUpdateIssue(issue.id, { status: 'blocked' })
    try {
      await patchIssue(issue.id, { status: 'blocked', comment: blockedReason.trim() })
      toast.success('Task marked blocked')
      setShowBlockedReason(false)
      setBlockedReason('')
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdateIssue(issue.id, { status: prev })
      toast.error('Failed to mark blocked', handleMarkBlocked)
    }
  }

  const handleReassign = async (agentId: string) => {
    if (!agent?.currentIssue) return
    const issues = queryClient.getQueryData<Issue[]>(['pipeline-issues', companyId]) ?? []
    const issue = issues.find((i) => i.identifier === agent.currentIssue!.identifier)
    if (!issue) return
    const prev = issue.assigneeAgentId
    optimisticUpdateIssue(issue.id, { assigneeAgentId: agentId })
    setShowReassign(false)
    try {
      await patchIssue(issue.id, { assigneeAgentId: agentId })
      toast.success('Task reassigned')
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdateIssue(issue.id, { assigneeAgentId: prev })
      toast.error('Failed to reassign', () => handleReassign(agentId))
    }
  }

  const fetchTaskSuggestions = useCallback((q: string) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (!q.trim()) { setTaskSuggestions([]); return }
    searchDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/proxy?path=${encodeURIComponent(`/api/companies/${companyId}/issues?q=${encodeURIComponent(q)}&status=todo,backlog`)}`,
        )
        if (!res.ok) return
        const data: Issue[] = await res.json()
        setTaskSuggestions(data.slice(0, 5).map((i) => ({ id: i.id, identifier: i.identifier, title: i.title })))
      } catch {
        // ignore search errors
      }
    }, 300)
  }, [companyId])

  const handleAssignTask = async (taskId: string, taskIdentifier: string) => {
    if (!agent) return
    try {
      await patchIssue(taskId, { assigneeAgentId: agent.id, status: 'todo' })
      toast.success(`Assigned ${taskIdentifier} to ${agent.name}`)
      setTaskSearch('')
      setTaskSuggestions([])
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      toast.error('Failed to assign task', () => handleAssignTask(taskId, taskIdentifier))
    }
  }

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
            className="fixed right-0 top-0 bottom-0 flex flex-col overflow-y-auto"
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
                  {agent.urlKey && (
                    <a
                      href={`/${companyPrefix}/agents/${agent.urlKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pixel-text"
                      style={{ fontSize: '0.5rem', color: color, marginTop: '2px', display: 'inline-block', textDecoration: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                    >
                      View in Paperclip →
                    </a>
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
                className="w-7 h-7 flex items-center justify-center rounded transition-colors flex-shrink-0"
                style={{
                  color: '#475569',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
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

            {/* Current task + write controls */}
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
                  <a
                    href={`/${companyPrefix}/issues/${agent.currentIssue.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pixel-text mb-1"
                    style={{ fontSize: '0.55rem', color: 'var(--active)', display: 'block', textDecoration: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {agent.currentIssue.identifier}
                  </a>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    {agent.currentIssue.title}
                  </div>
                </div>

                {/* Write controls */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={handleMarkDone} className="ghost-btn">Mark Done</button>
                  <button
                    onClick={() => setShowBlockedReason((r) => !r)}
                    className="ghost-btn"
                    style={{ borderColor: showBlockedReason ? 'var(--error)' : undefined }}
                  >
                    Mark Blocked
                  </button>
                  <button
                    onClick={() => setShowReassign((r) => !r)}
                    className="ghost-btn"
                  >
                    Reassign
                  </button>
                </div>

                {showBlockedReason && (
                  <div className="mt-2">
                    <textarea
                      className="w-full rounded p-2 text-sm"
                      rows={2}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--error)',
                        color: 'white',
                        resize: 'vertical',
                        outline: 'none',
                      }}
                      placeholder="Reason for blocking..."
                      value={blockedReason}
                      onChange={(e) => setBlockedReason(e.target.value)}
                    />
                    <button className="ghost-btn mt-1" onClick={handleMarkBlocked}>Submit</button>
                  </div>
                )}

                {showReassign && (
                  <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
                    {agents.filter((a) => a.id !== agent.id).map((a) => (
                      <button
                        key={a.id}
                        title={a.name}
                        onClick={() => handleReassign(a.id)}
                        className="flex-shrink-0 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            backgroundColor: (ROLE_COLORS[a.role] ?? ROLE_COLORS.default) + '33',
                            border: `2px solid ${ROLE_COLORS[a.role] ?? ROLE_COLORS.default}`,
                            color: ROLE_COLORS[a.role] ?? ROLE_COLORS.default,
                            fontSize: '0.55rem',
                          }}
                        >
                          {getInitials(a.name)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Run section */}
            {agent.activeRun && (
              <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="pixel-text mb-2" style={{ fontSize: '0.5rem', color: '#334155' }}>
                  ACTIVE RUN
                </div>
                <div className="flex items-center justify-between">
                  <span className="mono" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {agent.activeRun.id.slice(0, 8)} · {formatRunDuration(agent.activeRun.startedAt)}
                  </span>
                  {!confirmStop ? (
                    <button
                      onClick={() => setConfirmStop(true)}
                      className="ghost-btn"
                      style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.7rem' }}
                    >
                      Cancel Run
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          toast.error('Run cancellation not yet available via API')
                          setConfirmStop(false)
                        }}
                        className="ghost-btn"
                        style={{ borderColor: 'var(--error)', color: 'var(--error)', fontSize: '0.7rem' }}
                      >
                        Confirm
                      </button>
                      <button onClick={() => setConfirmStop(false)} className="ghost-btn" style={{ fontSize: '0.7rem' }}>No</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assign New Task */}
            <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="pixel-text mb-2" style={{ fontSize: '0.5rem', color: '#334155' }}>
                ASSIGN NEW TASK
              </div>
              <input
                className="w-full rounded px-2 py-1.5 text-sm"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  outline: 'none',
                }}
                placeholder="Search tasks..."
                value={taskSearch}
                onChange={(e) => {
                  setTaskSearch(e.target.value)
                  fetchTaskSuggestions(e.target.value)
                }}
              />
              {taskSuggestions.length > 0 && (
                <div
                  className="mt-1 rounded"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {taskSuggestions.map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center px-2 py-2 hover:bg-white/5 cursor-default"
                    >
                      <span className="text-xs truncate flex-1 mr-2" style={{ color: '#94a3b8' }}>
                        <span className="mono mr-1" style={{ color: '#475569', fontSize: '0.6rem' }}>{t.identifier}</span>
                        {t.title.slice(0, 38)}{t.title.length > 38 ? '…' : ''}
                      </span>
                      <button
                        className="ghost-btn flex-shrink-0"
                        style={{ fontSize: '0.65rem', padding: '2px 8px' }}
                        onClick={() => handleAssignTask(t.id, t.identifier)}
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance metrics */}
            <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="pixel-text mb-3" style={{ fontSize: '0.5rem', color: '#334155' }}>
                RECENT ACTIVITY (LAST 10 EVENTS)
              </div>
              <div className="flex gap-4">
                <div
                  className="flex-1 rounded p-3 text-center"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="font-bold tabular" style={{ fontSize: '1.25rem', color: '#34d399' }}>
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
                  <div className="font-bold tabular" style={{ fontSize: '1.25rem', color: '#f59e0b' }}>
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
                  <div className="font-bold tabular" style={{ fontSize: '1.25rem', color: color }}>
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
            <div className="flex-1 px-5 py-4">
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
                          <a
                            href={`/${event.issueIdentifier.split('-')[0]}/issues/${event.issueIdentifier}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pixel-text"
                            style={{ fontSize: '0.5rem', color: '#475569', marginRight: '4px', textDecoration: 'none' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.textDecoration = 'underline' }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.textDecoration = 'none' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.issueIdentifier}
                          </a>
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
