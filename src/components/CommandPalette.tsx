import { useState, useEffect, useCallback, useRef } from 'react'
import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import type { Agent, Issue } from '../types'
import { patchIssue, postComment, createIssue } from '../api'
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
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
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
  try { return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) ?? '[]') } catch { return [] }
}

function saveRecent(item: RecentItem): void {
  const existing = loadRecent().filter((r) => r.id !== item.id)
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify([item, ...existing].slice(0, MAX_RECENT)))
}

type Intent =
  | { kind: 'assign'; issueId: string }
  | { kind: 'done'; issueId: string }
  | { kind: 'block'; issueId: string }
  | { kind: 'create' }
  | { kind: 'comment'; issueId: string }
  | { kind: 'search'; query: string }

function resolveIssueId(identifier: string, issues: Issue[]): string {
  const found = issues.find((i) => i.identifier.toLowerCase() === identifier.toLowerCase())
  return found?.id ?? identifier
}

function parseIntent(input: string, issues: Issue[]): Intent {
  const lower = input.toLowerCase().trim()
  const assignMatch = lower.match(/^assign\s+([a-z]+-\d+)/i)
  if (assignMatch) return { kind: 'assign', issueId: resolveIssueId(assignMatch[1], issues) }
  const doneMatch = lower.match(/^(?:done|close|mark done)\s+([a-z]+-\d+)/i)
  if (doneMatch) return { kind: 'done', issueId: resolveIssueId(doneMatch[1], issues) }
  const blockMatch = lower.match(/^block\s+([a-z]+-\d+)/i)
  if (blockMatch) return { kind: 'block', issueId: resolveIssueId(blockMatch[1], issues) }
  if (lower.startsWith('new ') || lower.startsWith('create')) return { kind: 'create' }
  const commentMatch = lower.match(/^(?:comment|note)\s+([a-z]+-\d+)/i)
  if (commentMatch) return { kind: 'comment', issueId: resolveIssueId(commentMatch[1], issues) }
  return { kind: 'search', query: input }
}

interface Props {
  open: boolean
  agents: Agent[]
  pipelineIssues: Issue[]
  companyId: string
  onClose: () => void
  onSelectAgent: (agentId: string) => void
}

export function CommandPalette({ open, agents, pipelineIssues, companyId, onClose, onSelectAgent }: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [confirmDone, setConfirmDone] = useState<{ issueId: string; title: string } | null>(null)
  const [blockFlow, setBlockFlow] = useState<{ issueId: string; title: string } | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [assignFlow, setAssignFlow] = useState<{ issueId: string; title: string } | null>(null)
  const [createFlow, setCreateFlow] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createAgent, setCreateAgent] = useState('')
  const [createPriority, setCreatePriority] = useState('medium')
  const [commentFlow, setCommentFlow] = useState<{ issueId: string; title: string } | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const recentItems = loadRecent()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setInputValue('')
      setConfirmDone(null)
      setBlockFlow(null)
      setBlockReason('')
      setAssignFlow(null)
      setCreateFlow(false)
      setCreateTitle('')
      setCreateAgent('')
      setCreatePriority('medium')
      setCommentFlow(null)
      setCommentText('')
      setSubmitting(false)
    }
  }, [open])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
  }, [queryClient, companyId])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    const intent = parseIntent(value, pipelineIssues)
    if (intent.kind === 'done' && intent.issueId) {
      const issue = pipelineIssues.find((i) => i.id === intent.issueId)
      if (issue) { setConfirmDone({ issueId: issue.id, title: issue.identifier }); setBlockFlow(null); setAssignFlow(null); setCommentFlow(null); setCreateFlow(false) }
    } else if (intent.kind === 'block' && intent.issueId) {
      const issue = pipelineIssues.find((i) => i.id === intent.issueId)
      if (issue) { setBlockFlow({ issueId: issue.id, title: issue.identifier }); setConfirmDone(null); setAssignFlow(null); setCommentFlow(null); setCreateFlow(false) }
    } else if (intent.kind === 'assign' && intent.issueId) {
      const issue = pipelineIssues.find((i) => i.id === intent.issueId)
      if (issue) { setAssignFlow({ issueId: issue.id, title: issue.identifier }); setConfirmDone(null); setBlockFlow(null); setCommentFlow(null); setCreateFlow(false) }
    } else if (intent.kind === 'create') {
      setCreateFlow(true); setConfirmDone(null); setBlockFlow(null); setAssignFlow(null); setCommentFlow(null)
    } else if (intent.kind === 'comment' && intent.issueId) {
      const issue = pipelineIssues.find((i) => i.id === intent.issueId)
      if (issue) { setCommentFlow({ issueId: issue.id, title: issue.identifier }); setConfirmDone(null); setBlockFlow(null); setAssignFlow(null); setCreateFlow(false) }
    } else {
      setConfirmDone(null); setBlockFlow(null); setAssignFlow(null); setCreateFlow(false); setCommentFlow(null)
    }
  }, [pipelineIssues])

  const handleMarkDone = useCallback(async (issueId: string) => {
    setSubmitting(true)
    try {
      await patchIssue(issueId, { status: 'done' })
      toast.success('Marked as done')
      invalidate()
      onClose()
    } catch {
      toast.error('Failed to mark done')
    } finally { setSubmitting(false) }
  }, [invalidate, onClose])

  const handleMarkBlocked = useCallback(async (issueId: string, reason: string) => {
    setSubmitting(true)
    try {
      await patchIssue(issueId, { status: 'blocked', comment: reason || undefined })
      toast.success('Marked as blocked')
      invalidate()
      onClose()
    } catch {
      toast.error('Failed to block issue')
    } finally { setSubmitting(false) }
  }, [invalidate, onClose])

  const handleAssign = useCallback(async (issueId: string, agentId: string) => {
    setSubmitting(true)
    try {
      await patchIssue(issueId, { assigneeAgentId: agentId })
      toast.success('Reassigned')
      invalidate()
      onClose()
    } catch {
      toast.error('Failed to reassign')
    } finally { setSubmitting(false) }
  }, [invalidate, onClose])

  const handleCreate = useCallback(async () => {
    if (!createTitle.trim()) return
    setSubmitting(true)
    try {
      await createIssue(companyId, {
        title: createTitle.trim(),
        assigneeAgentId: createAgent || undefined,
        priority: createPriority,
        status: 'todo',
      })
      toast.success('Task created')
      invalidate()
      onClose()
    } catch {
      toast.error('Failed to create task')
    } finally { setSubmitting(false) }
  }, [createTitle, createAgent, createPriority, companyId, invalidate, onClose])

  const handlePostComment = useCallback(async (issueId: string, text: string) => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await postComment(issueId, text.trim())
      toast.success('Comment posted')
      onClose()
    } catch {
      toast.error('Failed to post comment')
    } finally { setSubmitting(false) }
  }, [onClose])

  const handleSelectAgent = useCallback((agent: Agent) => {
    saveRecent({ id: agent.id, label: agent.name, sub: agent.title ?? agent.role, type: 'agent' })
    onSelectAgent(agent.id)
    onClose()
  }, [onSelectAgent, onClose])

  const handleSelectIssue = useCallback((issue: Issue) => {
    saveRecent({ id: issue.id, label: issue.identifier, sub: issue.title, type: 'task' })
    const prefix = issue.identifier.split('-')[0]
    window.open(`/${prefix}/issues/${issue.identifier}`, '_blank', 'noopener,noreferrer')
    onClose()
  }, [onClose])

  const writeActionStyle = { borderLeft: '2px solid var(--accent-violet)', paddingLeft: 8 }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0"
            style={{ zIndex: 60, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            key="cp-panel"
            initial={{ opacity: 0, scale: 0.96, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed left-1/2"
            style={{ zIndex: 70, top: '20%', transform: 'translateX(-50%)', width: '540px', maxWidth: 'calc(100vw - 32px)' }}
          >
            <Command
              className="rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30,37,53,0.98), rgba(13,17,23,0.99))',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(129,140,248,0.15)',
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#475569', fontSize: '0.875rem' }}>⌘</span>
                <Command.Input
                  ref={inputRef}
                  value={inputValue}
                  onValueChange={handleInputChange}
                  placeholder="Search agents, tasks… or: done APPU-X, block APPU-X, assign APPU-X, new task"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif' }}
                />
                <button onClick={onClose} className="pixel-text" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.5rem' }}>
                  ESC
                </button>
              </div>

              {/* Write action previews */}
              {confirmDone && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', ...writeActionStyle }}>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginBottom: 6 }}>⚡ Mark <strong>{confirmDone.title}</strong> as done?</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost-btn" disabled={submitting} onClick={() => handleMarkDone(confirmDone.issueId)} style={{ fontSize: '0.7rem' }}>Confirm (Enter)</button>
                    <button className="ghost-btn" onClick={() => setConfirmDone(null)} style={{ fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                </div>
              )}
              {blockFlow && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', ...writeActionStyle }}>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginBottom: 6 }}>⚡ Block <strong>{blockFlow.title}</strong></div>
                  <textarea
                    autoFocus
                    rows={2}
                    placeholder="Reason (optional)…"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleMarkBlocked(blockFlow.issueId, blockReason) } }}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, padding: '6px 8px', fontSize: '0.75rem', outline: 'none', resize: 'vertical', marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost-btn" disabled={submitting} onClick={() => handleMarkBlocked(blockFlow.issueId, blockReason)} style={{ fontSize: '0.7rem' }}>Block</button>
                    <button className="ghost-btn" onClick={() => setBlockFlow(null)} style={{ fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                </div>
              )}
              {assignFlow && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', ...writeActionStyle }}>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginBottom: 6 }}>⚡ Assign <strong>{assignFlow.title}</strong> to:</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {agents.map((a) => (
                      <button key={a.id} className="ghost-btn" disabled={submitting} onClick={() => handleAssign(assignFlow.issueId, a.id)} style={{ fontSize: '0.7rem' }}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {createFlow && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', ...writeActionStyle }}>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginBottom: 6 }}>⚡ New Task</div>
                  <input
                    autoFocus
                    placeholder="Task title…"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, padding: '6px 8px', fontSize: '0.75rem', outline: 'none', marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <select value={createAgent} onChange={(e) => setCreateAgent(e.target.value)} style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, padding: '4px 6px', fontSize: '0.7rem', outline: 'none' }}>
                      <option value="">Unassigned</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <select value={createPriority} onChange={(e) => setCreatePriority(e.target.value)} style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, padding: '4px 6px', fontSize: '0.7rem', outline: 'none' }}>
                      {['critical', 'high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost-btn" disabled={submitting || !createTitle.trim()} onClick={handleCreate} style={{ fontSize: '0.7rem' }}>Create</button>
                    <button className="ghost-btn" onClick={() => setCreateFlow(false)} style={{ fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                </div>
              )}
              {commentFlow && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', ...writeActionStyle }}>
                  <div style={{ fontSize: '0.75rem', color: '#7C3AED', marginBottom: 6 }}>⚡ Comment on <strong>{commentFlow.title}</strong></div>
                  <textarea
                    autoFocus
                    rows={3}
                    placeholder="Your comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment(commentFlow.issueId, commentText) }}
                    style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: 4, padding: '6px 8px', fontSize: '0.75rem', outline: 'none', resize: 'vertical', marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost-btn" disabled={submitting || !commentText.trim()} onClick={() => handlePostComment(commentFlow.issueId, commentText)} style={{ fontSize: '0.7rem' }}>Post (⌘↵)</button>
                    <button className="ghost-btn" onClick={() => setCommentFlow(null)} style={{ fontSize: '0.7rem' }}>Cancel</button>
                  </div>
                </div>
              )}

              <Command.List style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
                <Command.Empty>
                  <div className="pixel-text text-center py-8" style={{ fontSize: '0.55rem', color: '#1e293b' }}>NO RESULTS FOUND</div>
                </Command.Empty>

                {recentItems.length > 0 && (
                  <Command.Group heading="Recent">
                    {recentItems.map((item) => (
                      <Command.Item
                        key={`recent-${item.id}`}
                        value={`recent ${item.label} ${item.sub}`}
                        onSelect={() => {
                          if (item.type === 'agent') { onSelectAgent(item.id) } else { const prefix = item.label.split('-')[0]; window.open(`/${prefix}/issues/${item.label}`, '_blank', 'noopener,noreferrer') }
                          onClose()
                        }}
                        style={{ borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#334155' }}>↺</span>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.label}</div>
                            <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#334155' }}>{item.sub}</div>
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
                          <div style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: color + '22', border: `1px solid ${color}55`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(agent.name)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{agent.name}</div>
                            {agent.title && <div className="pixel-text" style={{ fontSize: '0.45rem', color: '#475569' }}>{agent.title}</div>}
                          </div>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: agent.activeRun ? 'var(--active)' : 'var(--idle)', flexShrink: 0 }} />
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
                          <div className="pixel-text" style={{ width: '52px', fontSize: '0.45rem', color: STATUS_COLORS[issue.status] ?? '#475569', flexShrink: 0 }}>
                            {issue.identifier}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', flex: 1, minWidth: 0 }} className="truncate">
                            {issue.title}
                          </div>
                          {/* Inline write buttons */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkDone(issue.id) }}
                              style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: 'var(--aura-done)', borderRadius: 3, cursor: 'pointer' }}
                              title="Mark done"
                            >
                              Done
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setBlockFlow({ issueId: issue.id, title: issue.identifier }); setInputValue(`block ${issue.identifier}`) }}
                              style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)', color: 'var(--aura-blocked)', borderRadius: 3, cursor: 'pointer' }}
                              title="Block issue"
                            >
                              Block
                            </button>
                          </div>
                          <div className="pixel-text px-1.5 py-0.5 rounded-sm" style={{ fontSize: '0.4rem', backgroundColor: (STATUS_COLORS[issue.status] ?? '#475569') + '22', color: STATUS_COLORS[issue.status] ?? '#475569', flexShrink: 0 }}>
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
