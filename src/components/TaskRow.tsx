import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Issue, Agent } from '../types'
import { patchIssue, postComment } from '../api'
import { toast } from '../useToast'
import { ParticleBurst } from './ParticleBurst'

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

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
]

interface Props {
  issue: Issue
  agents: Agent[]
  companyId: string
  isRefreshing?: boolean
}

export function TaskRow({ issue, agents, companyId, isRefreshing }: Props) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [showBlockedReason, setShowBlockedReason] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [burstActive, setBurstActive] = useState(false)
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const agent = agents.find((a) => a.id === issue.assigneeAgentId)
  const isBlocked = issue.status === 'blocked'
  const blockerCount = issue.blockedBy?.length ?? 0
  const chip = PRIORITY_CHIP[issue.priority] ?? PRIORITY_CHIP.low
  const agentColor = agent ? (ROLE_COLORS[agent.role] ?? ROLE_COLORS.default) : '#94a3b8'
  const initials = agent ? getInitials(agent.name) : '??'
  const relTime = getRelativeTime(issue.updatedAt)
  const isoTime = new Date(issue.updatedAt).toISOString()

  const optimisticUpdate = useCallback(
    (update: Partial<Issue>) => {
      queryClient.setQueryData<Issue[]>(['pipeline-issues', companyId], (old) =>
        old?.map((i) => (i.id === issue.id ? { ...i, ...update } : i)) ?? [],
      )
    },
    [queryClient, companyId, issue.id],
  )

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === issue.status) return
    if (newStatus === 'blocked') {
      setShowBlockedReason(true)
      return
    }
    const prev = issue.status
    optimisticUpdate({ status: newStatus })
    if (newStatus === 'done') {
      setBurstActive(true)
      setTimeout(() => setBurstActive(false), 600)
    }
    try {
      await patchIssue(issue.id, { status: newStatus })
      toast.success(`Status → ${newStatus.replace('_', ' ')}`)
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdate({ status: prev })
      toast.error('Failed to update status', () => handleStatusChange(newStatus))
    }
  }

  const handleSubmitBlocked = async () => {
    if (!blockedReason.trim()) return
    const prev = issue.status
    optimisticUpdate({ status: 'blocked' })
    try {
      await patchIssue(issue.id, { status: 'blocked', comment: blockedReason.trim() })
      toast.success('Task marked blocked')
      setShowBlockedReason(false)
      setBlockedReason('')
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdate({ status: prev })
      toast.error('Failed to mark blocked', handleSubmitBlocked)
    }
  }

  const handleReassignTask = async (agentId: string) => {
    const prev = issue.assigneeAgentId
    optimisticUpdate({ assigneeAgentId: agentId || null })
    try {
      await patchIssue(issue.id, { assigneeAgentId: agentId || null })
      toast.success('Reassigned')
      queryClient.invalidateQueries({ queryKey: ['pipeline-issues', companyId] })
    } catch {
      optimisticUpdate({ assigneeAgentId: prev })
      toast.error('Failed to reassign', () => handleReassignTask(agentId))
    }
  }

  const handlePostComment = async () => {
    if (!commentBody.trim() || submittingComment) return
    setSubmittingComment(true)
    try {
      await postComment(issue.id, commentBody.trim())
      toast.success('Comment posted')
      setCommentBody('')
      setShowComment(false)
    } catch {
      toast.error('Failed to post comment', handlePostComment)
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div
      className={`rounded-lg cursor-pointer transition-all duration-150 select-none relative overflow-hidden ${
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
      <ParticleBurst active={burstActive} />
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
            <a
              href={`/${issue.identifier.split('-')[0]}/issues/${issue.identifier}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono flex-shrink-0"
              style={{ fontSize: '0.65rem', color: '#64748b', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.textDecoration = 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              {issue.identifier}
            </a>
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
          <span
            className="tabular hidden sm:block"
            style={{ fontSize: '0.65rem', color: '#475569' }}
            title={isoTime}
          >
            {relTime}
          </span>
          <svg
            className="flex-shrink-0 transition-transform duration-200"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', color: '#475569' }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Accordion content */}
      {expanded && (
        <div
          className="px-3 pb-3 animate-fade-in"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderLeft: isBlocked ? '2px solid var(--aura-blocked)' : '2px solid var(--accent-cyan)',
            ...(isBlocked ? { boxShadow: 'inset 4px 0 12px rgba(255,107,53,0.12)' } : {}),
          }}
          onClick={(e) => e.stopPropagation()}
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
            <div className="mt-2 mb-3">
              <div
                className="mb-1"
                style={{ fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase' }}
              >
                Blocked by:
              </div>
              <div className="flex flex-wrap gap-1">
                {issue.blockedBy.map((b) => (
                  <a
                    key={b.id}
                    href={`/${b.identifier.split('-')[0]}/issues/${b.identifier}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      color: '#f59e0b',
                      fontSize: '0.65rem',
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.2)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)' }}
                    title={b.title}
                  >
                    {b.identifier}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Write controls strip */}
          <div
            className="mt-3 pt-3 flex flex-wrap gap-2 items-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {/* Status dropdown */}
            <select
              className="text-xs rounded px-2 py-1"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
              }}
              value={issue.status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Assign To dropdown */}
            <select
              className="text-xs rounded px-2 py-1"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                cursor: 'pointer',
              }}
              value={issue.assigneeAgentId ?? ''}
              onChange={(e) => handleReassignTask(e.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            {/* Comment button */}
            {!showComment ? (
              <button
                className="ghost-btn"
                style={{ fontSize: '0.7rem', padding: '3px 10px' }}
                onClick={() => {
                  setShowComment(true)
                  setTimeout(() => commentRef.current?.focus(), 50)
                }}
              >
                + Comment
              </button>
            ) : null}
          </div>

          {/* Blocked reason textarea */}
          {showBlockedReason && (
            <div className="mt-2">
              <textarea
                className="w-full text-xs rounded p-2"
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
              <div className="flex gap-1 mt-1">
                <button className="ghost-btn" style={{ fontSize: '0.7rem', padding: '3px 10px' }} onClick={handleSubmitBlocked}>
                  Submit
                </button>
                <button
                  className="ghost-btn"
                  style={{ fontSize: '0.7rem', padding: '3px 10px' }}
                  onClick={() => { setShowBlockedReason(false); setBlockedReason('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Comment textarea */}
          {showComment && (
            <div className="mt-2">
              <textarea
                ref={commentRef}
                className="w-full text-xs rounded p-2"
                rows={3}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  resize: 'vertical',
                  outline: 'none',
                }}
                placeholder="Add a comment... (⌘↵ to submit)"
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePostComment()
                }}
              />
              <div className="flex gap-1 mt-1">
                <button
                  className="ghost-btn"
                  style={{ fontSize: '0.7rem', padding: '3px 10px', opacity: submittingComment ? 0.5 : 1 }}
                  onClick={handlePostComment}
                  disabled={submittingComment}
                >
                  {submittingComment ? 'Posting…' : 'Post'}
                </button>
                <button
                  className="ghost-btn"
                  style={{ fontSize: '0.7rem', padding: '3px 10px' }}
                  onClick={() => { setShowComment(false); setCommentBody('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            className="mt-2 tabular"
            style={{ fontSize: '0.6rem', color: '#475569' }}
            title={isoTime}
          >
            Updated {new Date(issue.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
