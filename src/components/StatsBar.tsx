import { useEffect, useRef } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { Agent, ActivityEvent, Issue } from '../types'
import { isDemoMode } from '../config'

const KPI_CONFIGS = [
  { id: 'total', label: 'Total Agents', color: '#818CF8' },
  { id: 'active', label: 'Active Now', color: '#22D3EE' },
  { id: 'inprogress', label: 'In Progress', color: '#6366f1' },
  { id: 'blocked', label: 'Blocked', color: '#F59E0B' },
  { id: 'done', label: 'Done Today', color: '#34D399' },
] as const

type KpiId = (typeof KPI_CONFIGS)[number]['id']

interface Props {
  agents: Agent[]
  pipelineIssues: Issue[]
  activityEvents: ActivityEvent[]
}

function buildDemoSeed(init: Record<KpiId, number>): Record<KpiId, number[]> {
  return {
    total: [init.total - 2, init.total - 1, init.total, init.total + 1, init.total, init.total].map(
      (v) => Math.max(0, v),
    ),
    active: [2, 3, 4, 3, init.active + 1, init.active].map((v) => Math.max(0, v)),
    inprogress: [3, 5, 4, 6, 4, init.inprogress].map((v) => Math.max(0, v)),
    blocked: [1, 2, 0, 1, 2, init.blocked].map((v) => Math.max(0, v)),
    done: [3, 5, 2, 4, 6, init.done].map((v) => Math.max(0, v)),
  }
}

export function StatsBar({ agents, pipelineIssues, activityEvents }: Props) {
  const today = new Date().toDateString()

  const total = agents.length
  const active = agents.filter((a) => a.activeRun !== null).length
  const inprogress = pipelineIssues.filter((i) => i.status === 'in_progress').length
  const blocked = pipelineIssues.filter((i) => i.status === 'blocked').length
  const done = activityEvents.filter(
    (e) => e.type === 'done' && new Date(e.timestamp).toDateString() === today,
  ).length

  const snapshotsRef = useRef<Record<KpiId, number[]> | null>(null)

  if (snapshotsRef.current === null) {
    const init: Record<KpiId, number> = { total, active, inprogress, blocked, done }
    snapshotsRef.current = isDemoMode
      ? buildDemoSeed(init)
      : { total: [], active: [], inprogress: [], blocked: [], done: [] }
  }

  useEffect(() => {
    const curr: Record<KpiId, number> = { total, active, inprogress, blocked, done }
    const snapshots = snapshotsRef.current!
    for (const id of Object.keys(curr) as KpiId[]) {
      const val = curr[id]
      const existing = snapshots[id]
      if (existing.length === 0 || existing[existing.length - 1] !== val) {
        snapshots[id] = [...existing, val].slice(-6)
      }
    }
  }, [total, active, inprogress, blocked, done])

  const currentValues: Record<KpiId, number> = { total, active, inprogress, blocked, done }
  const snapshots = snapshotsRef.current

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
      {KPI_CONFIGS.map((cfg) => {
        const value = currentValues[cfg.id]
        const past = snapshots[cfg.id]
        const sparkData = [...past, value].slice(-7).map((v, i) => ({ v, i }))
        const prevValue = past[past.length - 1]
        const delta =
          prevValue !== undefined && prevValue !== value ? value - prevValue : 0

        return (
          <KpiTile
            key={cfg.id}
            label={cfg.label}
            value={value}
            color={cfg.color}
            delta={delta}
            sparkData={sparkData}
          />
        )
      })}
    </div>
  )
}

function KpiTile({
  label,
  value,
  color,
  delta,
  sparkData,
}: {
  label: string
  value: number
  color: string
  delta: number
  sparkData: { v: number; i: number }[]
}) {
  return (
    <div
      className="glass-card rounded-xl p-3 flex flex-col gap-1.5 relative overflow-hidden"
      style={{ borderTop: `2px solid ${color}50` }}
    >
      <span
        style={{
          fontSize: '0.58rem',
          color: '#64748b',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>

      <div className="flex items-baseline gap-2">
        <span
          className="mono"
          style={{ fontSize: '1.6rem', fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}
        >
          {value}
        </span>
        {delta !== 0 && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              color: delta > 0 ? '#34d399' : '#f87171',
            }}
          >
            {delta > 0 ? '+' : ''}
            {delta} {delta > 0 ? '↑' : '↓'}
          </span>
        )}
      </div>

      {sparkData.length > 1 && (
        <div style={{ height: '28px', marginTop: '2px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
