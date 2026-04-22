import { useState } from 'react'
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
import { isDemoMode, POLL_INTERVAL_MS, COMPANIES, getSelectedCompany, saveSelectedCompany } from './config'
import type { Company } from './config'

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
  } = usePipelineIssues(selectedCompany.id)

  const {
    data: activityEvents,
    isFetching: isActivityFetching,
  } = useActivity(selectedCompany.id)

  const isRefreshing = isAgentsFetching || isPipelineFetching || isActivityFetching
  const lastUpdated = dataUpdatedAt ?? Date.now()

  function handleCompanyChange(company: Company) {
    saveSelectedCompany(company)
    setSelectedCompany(company)
    queryClient.removeQueries({ queryKey: ['agents', selectedCompany.id] })
    queryClient.removeQueries({ queryKey: ['pipeline-issues', selectedCompany.id] })
    queryClient.removeQueries({ queryKey: ['activity', selectedCompany.id] })
  }

  return (
    <div
      className="min-h-screen relative scanlines flex flex-col"
      style={{ backgroundColor: 'var(--bg-void)' }}
    >
      {/* Header */}
      <header
        className="w-full px-5 py-2.5 flex items-center justify-between flex-shrink-0"
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

        {/* Right: company switcher + last sync + refresh ring */}
        <div className="flex items-center gap-4">
          <CompanySwitcher selected={selectedCompany} onChange={handleCompanyChange} />
          {dataUpdatedAt > 0 && (
            <span className="pixel-text" style={{ fontSize: '0.55rem', color: '#334155' }}>
              Last sync {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
          <RefreshCountdownRing
            intervalMs={POLL_INTERVAL_MS}
            lastUpdatedAt={lastUpdated}
            isRefreshing={isRefreshing}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-6 pt-4 flex flex-col gap-4 max-w-screen-2xl w-full mx-auto">
        {isLoading && <LoadingScreen />}
        {isError && (
          <ErrorScreen
            message={error instanceof Error ? error.message : 'Unknown error'}
          />
        )}

        {agents && (
          <>
            {/* KPI Stats Bar */}
            <StatsBar
              agents={agents}
              pipelineIssues={pipelineIssues ?? []}
              activityEvents={activityEvents ?? []}
            />

            {/* Agent office grid */}
            <div className={isRefreshing ? 'refresh-shimmer rounded-xl' : ''}>
              <Office agents={agents} />
            </div>

            {/* Pipeline + Activity two-panel row */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'minmax(0, 55fr) minmax(0, 45fr)',
                minHeight: '380px',
              }}
            >
              <PipelinePanel
                issues={pipelineIssues ?? []}
                agents={agents}
                isRefreshing={isPipelineFetching}
              />
              <ActivityFeed
                events={activityEvents ?? []}
                isRefreshing={isActivityFetching}
              />
            </div>

            {/* Activity Heatmap */}
            <ActivityHeatmap
              agents={agents}
              events={activityEvents ?? []}
            />
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
        <span className="pixel-text" style={{ fontSize: '0.5rem', color: '#1e293b' }}>
          Built with Paperclip Agents
        </span>
        <span className="pixel-text" style={{ fontSize: '0.5rem', color: '#1e293b' }}>
          {new Date().getFullYear()} LEMAA
        </span>
      </footer>
    </div>
  )
}
