import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Issue, Agent } from '../types'
import { patchIssue } from '../api'
import { toast } from '../useToast'

interface TriageModalProps {
  isOpen: boolean
  onClose: () => void
  blockedIssues: Issue[]
  agents: Agent[]
  onUpdate: (issueId: string, patch: Partial<Issue>) => void
}

export function TriageModal({ isOpen, onClose, blockedIssues, agents, onUpdate }: TriageModalProps) {
  const [reassignRowOpen, setReassignRowOpen] = useState<string | null>(null)
  const [localIssues, setLocalIssues] = useState<Issue[]>(blockedIssues)
  const [pulseGreen, setPulseGreen] = useState(false)

  useEffect(() => {
    setLocalIssues(blockedIssues)
  }, [blockedIssues])

  useEffect(() => {
    if (localIssues.length === 0 && isOpen) {
      setPulseGreen(true)
      toast.success('All clear — incident resolved.')
      const timer = setTimeout(() => {
        onClose()
        setPulseGreen(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [localIssues.length, isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleClearBlockers = useCallback(async (issueId: string) => {
    const prev = localIssues.find((i) => i.id === issueId)
    setLocalIssues((prev) => prev.filter((i) => i.id !== issueId))
    onUpdate(issueId, { blockedByIssueIds: [], blockedBy: [], status: 'in_progress' })
    try {
      await patchIssue(issueId, { blockedByIssueIds: [], status: 'in_progress' })
    } catch {
      if (prev) setLocalIssues((curr) => [...curr, prev])
      toast.error('Failed to clear blockers')
    }
  }, [localIssues, onUpdate])

  const handleMarkInProgress = useCallback(async (issueId: string) => {
    const prev = localIssues.find((i) => i.id === issueId)
    setLocalIssues((prev) => prev.filter((i) => i.id !== issueId))
    onUpdate(issueId, { status: 'in_progress' })
    try {
      await patchIssue(issueId, { status: 'in_progress' })
    } catch {
      if (prev) setLocalIssues((curr) => [...curr, prev])
      toast.error('Failed to update status')
    }
  }, [localIssues, onUpdate])

  const handleReassignInTriage = useCallback(async (issueId: string, agentId: string) => {
    onUpdate(issueId, { assigneeAgentId: agentId })
    setReassignRowOpen(null)
    try {
      await patchIssue(issueId, { assigneeAgentId: agentId })
    } catch {
      toast.error('Failed to reassign')
    }
  }, [onUpdate])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — does NOT dismiss on click */}
          <motion.div
            className="fixed inset-0"
            style={{ zIndex: 80, backgroundColor: 'rgba(4,6,13,0.85)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2"
            style={{
              zIndex: 90,
              translateX: '-50%',
              translateY: '-50%',
              width: 600,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(4,6,13,0.95)',
              border: `1px solid ${pulseGreen ? 'var(--aura-done)' : 'var(--aura-blocked)'}`,
              boxShadow: pulseGreen ? 'var(--glow-success)' : 'var(--glow-blocked)',
              borderRadius: 12,
            }}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,107,53,0.2)' }}
            >
              <span
                className="section-label"
                style={{ color: pulseGreen ? 'var(--aura-done)' : 'var(--aura-blocked)', fontSize: '0.8rem' }}
              >
                INCIDENT TRIAGE
              </span>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8',
                  borderRadius: 6,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4">
              {localIssues.length === 0 ? (
                <div className="text-center py-8 section-label" style={{ color: 'var(--aura-done)' }}>
                  ALL CLEAR — RESOLVING…
                </div>
              ) : (
                localIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 p-3 rounded mb-2 transition-all"
                    style={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,107,53,0.2)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="task-id">{issue.identifier}</span>
                      <p className="text-sm mt-0.5 truncate" style={{ color: '#e2e8f0' }}>{issue.title}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--aura-idle)' }}>
                        Assignee: {agents.find((a) => a.id === issue.assigneeAgentId)?.name ?? 'Unassigned'}
                      </p>
                      {(issue.blockedBy?.length ?? 0) > 0 && (
                        <p className="text-xs mt-1" style={{ color: 'var(--aura-blocked)' }}>
                          Blocked by: {issue.blockedBy!.map((b) => b.identifier).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {(issue.blockedByIssueIds?.length ?? issue.blockedBy?.length ?? 0) > 0 ? (
                        <button className="ghost-btn text-xs" onClick={() => handleClearBlockers(issue.id)}>
                          Clear Blockers
                        </button>
                      ) : (
                        <button className="ghost-btn text-xs" onClick={() => handleMarkInProgress(issue.id)}>
                          Mark In Progress
                        </button>
                      )}
                      <button
                        className="ghost-btn text-xs"
                        onClick={() => setReassignRowOpen(reassignRowOpen === issue.id ? null : issue.id)}
                      >
                        Reassign
                      </button>
                      {reassignRowOpen === issue.id && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {agents.map((a) => (
                            <button
                              key={a.id}
                              title={a.name}
                              onClick={() => handleReassignInTriage(issue.id, a.id)}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 4,
                                padding: '2px 6px',
                                cursor: 'pointer',
                                color: '#e2e8f0',
                                fontSize: '0.65rem',
                              }}
                            >
                              {a.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
