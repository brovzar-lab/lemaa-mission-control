import { useState, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAgents } from './useAgents'
import { usePipelineIssues } from './useIssues'
import { useActivity } from './useActivity'
import { Office } from './Office'
import { PipelinePanel } from './components/PipelinePanel'
import { ActivityFeed } from './components/ActivityFeed'
import { RefreshCountdownRing } from './components/RefreshCountdownRing'
import { StatsBar } from './components/StatsBar'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { AgentDetailDrawer } from './components/AgentDetailDrawer'
import { CommandPalette } from './components/CommandPalette'
import { HealthOrb } from './components/HealthOrb'
import { ToastSystem } from './components/ToastSystem'
import { LiveClock } from './components/LiveClock'
import { EventTicker } from './components/EventTicker'
import { TriageModal } from './components/TriageModal'
import { ShortcutOverlay } from './components/ShortcutOverlay'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { isDemoMode, POLL_INTERVAL_MS, COMPANIES, getSelectedCompany, saveSelectedCompany } from './config'
import type { Company } from './config'
import type { Issue } from './types'

type PipelineTab = 'in_progress' | 'blocked' | 'in_review' | 'todo'

const STAGGER = { initial: { y: 12, opacity: 0 }, animate: { y: 0, opacity: 1 } }

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="pixel-text" style={{ color: 'var(--active)', fontSize: '0.75rem' }}>
        BOOTING MISSION CONTROL...
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-sm animate-bounce"
            style={{ backgroundColor: 'var(--active)', animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2">
      <div className="pixel-text" style={{ color: 'var(--error)', fontSize: '0.75rem' }}>
        CONNECTION FAILED
      </div>
      <div className="pixel-text max-w-sm text-center" style={{ color: '#64748b', fontSize: '0.65rem' }}>
        {message}
      </div>
    </div>
  )
}

function CompanySwitcher({
  selected,
  onChange,
}: {
  selected: Company
  onChange: (c: Company) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {COMPANIES.map((company) => (
        <button
          key={company.id}
          onClick={() => onChange(company)}
          title={company.name}
          className="pixel-text px-2.5 py-1 rounded transition-all"
          style={{
            fontSize: '0.55rem',
            backgroundColor: selected.id === company.id
              ? 'rgba(99,102,241,0.25)'
              : 'rgba(255,255,255,0.04)',
            border: selected.id === company.id
              ? '1px solid rgba(99,102,241,0.6)'
              : '1px solid rgba(255,255,255,0.08)',
            color: selected.id === company.id ? '#a5b4fc' : '#475569',
            cursor: 'pointer',
            letterSpacing: '0.08em',
          }}
        >
          {company.short}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const queryClient = useQueryClient()
  const [selectedCompany, setSelectedCompany] = useState<Company>(getSelectedCompany)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [triageOpen, setTriageOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [pipelineTab, setPipelineTab] = useState<PipelineTab>('in_progress')
  const mainRef = useRef<HTMLElement>(null)

  const {
    data: agents,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    isFetching: isAgentsFetching,
  } = useAgents(selectedCompany.id)

  const {
    data: pipelineIssues,
    isFetching: isPipelineFetching,
    refetch: refetchPipeline,
  } = usePipelineIssues(selectedCompany.id)

  const {
    data: activityEvents,
    isFetching: isActivityFetching,
  } = useActivity(selectedCompany.id)

  const isRefreshing = isAgentsFetching || isPipelineFetching || isActivityFetching
  const lastUpdated = dataUpdatedAt ?? Date.now()

  const selectedAgent = agents?.find((a) => a.id === selectedAgentId) ?? null

  const companyPrefix = useMemo(() => {
    const sample = pipelineIssues?.[0] ?? agents?.find((a) => a.currentIssue)?.currentIssue
    if (sample?.identifier) return sample.identifier.split('-')[0]
    return selectedCompany.short
  }, [pipelineIssues, agents, selectedCompany.short])

  const incidentMode = useMemo(() => {
    const issues = pipelineIssues ?? []
    const active = issues.filter((i) => i.status !== 'todo')
    if (active.length === 0) return false
    const blocked = active.filter((i) => i.status === 'blocked').length
    return blocked / active.length > 0.4
  }, [pipelineIssues])

  const healthPercent = useMemo(() => {
    const list = agents ?? []
    if (list.length === 0) return 100
    return (list.filter((a) => a.currentIssue?.status !== 'blocked').length / list.length) * 100
  }, [agents])

  const handleCloseCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])
  const handleCloseDrawer = useCallback(() => setSelectedAgentId(null), [])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['agents', selectedCompany.id] })
    refetchPipeline()
  }, [queryClient, selectedCompany.id, refetchPipeline])

  useKeyboardShortcuts({
    onNewTask: useCallback(() => {
      setCommandPaletteOpen(true)
    }, []),
    onFilterBlocked: useCallback(() => {
      setPipelineTab('blocked')
      document.querySelector('.pipeline-section')?.scrollIntoView({ behavior: 'smooth' })
    }, []),
    onScrollOffice: useCallback(() => {
      document.querySelector('.office-section')?.scrollIntoView({ behavior: 'smooth' })
    }, []),
    onFocusPipeline: useCallback(() => {
      document.querySelector('.pipeline-section')?.scrollIntoView({ behavior: 'smooth' })
    }, []),
    onResetHome: useCallback(() => {
      setPipelineTab('in_progress')
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, []),
    onRefresh: handleRefresh,
    onToggleShortcuts: useCallback(() => setShortcutsOpen((v) => !v), []),
    onFocusAgent: useCallback((index: number) => {
      const cards = document.querySelectorAll<HTMLElement>('[data-agent-card]')
      cards[index]?.focus()
      cards[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, []),
    openPalette: useCallback(() => setCommandPaletteOpen((v) => !v), []),
  })

  function handleCompanyChange(company: Company) {
    saveSelectedCompany(company)
    setSelectedCompany(company)
    setSelectedAgentId(null)
    queryClient.removeQueries({ queryKey: ['agents', selectedCompany.id] })
    queryClient.removeQueries({ queryKey: ['pipeline-issues', selectedCompany.id] })
    queryClient.removeQueries({ queryKey: ['activity', selectedCompany.id] })
  }

  return (
    <div
      className="min-h-screen relative scanlines flex flex-col"
      style={{ backgroundColor: 'var(--bg-void)' }}
    >
      <EventTicker events={(activityEvents ?? []).slice(0, 10).map((e) => `${e.issueIdentifier}: ${e.issueTitle}`)} />

      {/* Header */}
      <header
        className="w-full px-5 py-2.5 flex items-center justify-between flex-shrink-0 min-h-[64px]"
        style={{
          background: 'linear-gradient(180deg, rgba(13,17,23,0.98) 0%, rgba(8,11,20,0.95) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        {/* Left: logo + title + company switcher */}
        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--active)', boxShadow: '0 0 6px var(--active)' }}
          />
          <span
            className="pixel-text"
            style={{ color: 'var(--active)', fontSize: '0.7rem' }}
          >
            Paperclip Mission Control
          </span>
          {isDemoMode && (
            <span
              className="pixel-text px-2 py-0.5 rounded"
              style={{
                fontSize: '0.55rem',
                backgroundColor: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#a78bfa',
              }}
            >
              Demo
            </span>
          )}
          <div
            style={{
              width: '1px',
              height: '14px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              margin: '0 4px',
            }}
          />
          <span
            className="pixel-text"
            style={{ fontSize: '0.6rem', color: '#64748b' }}
          >
            {selectedCompany.name}
          </span>
        </div>

        {/* Center: global health orb */}
        <div className="absolute left-1/2" style={{ transform: 'translateX(-50%)' }}>
          {agents && (
            <HealthOrb
              healthPercent={healthPercent}
              isIncident={incidentMode}
              onClick={incidentMode ? () => setTriageOpen(true) : undefined}
            />
          )}
        </div>

        {/* Right: company switcher + last sync + refresh ring */}
        <div className="flex items-center gap-4">
          <LiveClock />
          <CompanySwitcher selected={selectedCompany} onChange={handleCompanyChange} />
          {dataUpdatedAt > 0 && (
            <span className="pixel-text" style={{ fontSize: '0.55rem', color: '#64748b' }}>
              Last sync {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="section-label"
            style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '2px 6px', background: 'transparent', cursor: 'pointer', color: 'inherit' }}
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
          <kbd
            className="section-label"
            style={{ border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, padding: '2px 6px' }}
          >
            ⌘K
          </kbd>
          <RefreshCountdownRing
            intervalMs={POLL_INTERVAL_MS}
            lastUpdatedAt={lastUpdated}
            isRefreshing={isRefreshing}
          />
        </div>
      </header>

      <div className="h-px flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)' }} />

      {/* Main content */}
      <main ref={mainRef} className="flex-1 px-4 pb-6 pt-4 flex flex-col gap-4 max-w-screen-2xl w-full mx-auto">
        {isLoading && <LoadingScreen />}
        {isError && (
          <ErrorScreen
            message={error instanceof Error ? error.message : 'Unknown error'}
          />
        )}

        {/* NF1: Incident mode banner */}
        {incidentMode && (
          <div
            className="w-full px-4 py-2 flex items-center gap-3 rounded-lg animate-pulse"
            style={{
              backgroundColor: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.4)',
            }}
          >
            <span style={{ color: '#f87171', fontSize: '1rem' }}>⚠</span>
            <span className="pixel-text" style={{ fontSize: '0.6rem', color: '#f87171' }}>
              INCIDENT MODE — &gt;40% of active tasks are blocked. Blocked tasks have been escalated to the top of the pipeline.
            </span>
          </div>
        )}

        {agents && (
          <>
            {/* KPI Stats Bar */}
            <motion.div {...STAGGER} transition={{ duration: 0.2, delay: 0 }}>
              <StatsBar
                agents={agents}
                pipelineIssues={pipelineIssues ?? []}
                activityEvents={activityEvents ?? []}
              />
            </motion.div>

            {/* Agent office grid */}
            <motion.div
              className={`office-section ${isRefreshing ? 'refresh-shimmer rounded-xl' : ''}`}
              {...STAGGER}
              transition={{ duration: 0.2, delay: 0.04 }}
            >
              <Office agents={agents} onAgentClick={(id) => setSelectedAgentId(id)} />
            </motion.div>

            {/* Pipeline + Activity */}
            <motion.div
              className="pipeline-activity-grid pipeline-section"
              {...STAGGER}
              transition={{ duration: 0.2, delay: 0.08 }}
            >
              <PipelinePanel
                issues={incidentMode
                  ? [...(pipelineIssues ?? []).filter((i) => i.status === 'blocked'), ...(pipelineIssues ?? []).filter((i) => i.status !== 'blocked')]
                  : (pipelineIssues ?? [])}
                agents={agents}
                companyId={selectedCompany.id}
                isRefreshing={isPipelineFetching}
                activeTab={pipelineTab}
                onTabChange={setPipelineTab}
              />
              <ActivityFeed
                events={activityEvents ?? []}
                isRefreshing={isActivityFetching}
              />
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div {...STAGGER} transition={{ duration: 0.2, delay: 0.12 }}>
              <ActivityHeatmap
                agents={agents}
                events={activityEvents ?? []}
              />
            </motion.div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="flex-shrink-0 w-full px-5 py-1.5 flex items-center justify-between"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          backgroundColor: 'rgba(8,11,20,0.8)',
        }}
      >
        <span className="pixel-text" style={{ fontSize: '0.55rem', color: '#475569' }}>
          Built with Paperclip Agents
        </span>
        <div className="flex items-center gap-3">
          {[
            { key: 'N', label: 'New task' },
            { key: 'B', label: 'Blocked' },
            { key: 'R', label: 'Refresh' },
            { key: '?', label: 'Shortcuts' },
            { key: '⌘K', label: 'Command' },
          ].map(({ key, label }) => (
            <span key={key} className="pixel-text flex items-center gap-1" style={{ fontSize: '0.55rem', color: '#475569' }}>
              <kbd
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  fontFamily: 'inherit',
                  fontSize: '0.55rem',
                  color: '#94a3b8',
                }}
              >
                {key}
              </kbd>
              {label}
            </span>
          ))}
        </div>
        <span className="pixel-text" style={{ fontSize: '0.55rem', color: '#475569' }}>
          {new Date().getFullYear()} Paperclip
        </span>
      </footer>

      {/* Agent detail drawer */}
      <AgentDetailDrawer
        agent={selectedAgent}
        agents={agents ?? []}
        companyId={selectedCompany.id}
        activityEvents={activityEvents ?? []}
        companyPrefix={companyPrefix}
        onClose={handleCloseDrawer}
      />

      {/* Toast notifications */}
      <ToastSystem />

      {/* Command palette */}
      <CommandPalette
        open={commandPaletteOpen}
        agents={agents ?? []}
        pipelineIssues={pipelineIssues ?? []}
        companyId={selectedCompany.id}
        onClose={handleCloseCommandPalette}
        onSelectAgent={(id) => {
          setSelectedAgentId(id)
          setCommandPaletteOpen(false)
        }}
      />

      {/* Triage modal */}
      <TriageModal
        isOpen={triageOpen}
        onClose={() => setTriageOpen(false)}
        blockedIssues={(pipelineIssues ?? []).filter((i) => i.status === 'blocked')}
        agents={agents ?? []}
        onUpdate={(issueId, patch) => {
          queryClient.setQueryData<Issue[]>(['pipeline-issues', selectedCompany.id], (old) =>
            old?.map((i) => (i.id === issueId ? { ...i, ...patch } : i)) ?? []
          )
        }}
      />

      {/* Shortcut overlay */}
      <ShortcutOverlay isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
