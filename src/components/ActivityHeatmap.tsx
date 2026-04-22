import { useState } from 'react'
import type { Agent, ActivityEvent } from '../types'

function dayKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(dayKey(d))
  }
  return days
}

function getCellColor(count: number): string {
  if (count === 0) return 'var(--bg-elevated)'
  if (count <= 2) return 'rgba(20, 184, 166, 0.38)'
  if (count <= 5) return 'rgba(6, 182, 212, 0.65)'
  return 'var(--active)'
}

interface DayLabel {
  short: string
  date: string
  isToday: boolean
}

interface Props {
  agents: Agent[]
  events: ActivityEvent[]
}

export function ActivityHeatmap({ agents, events }: Props) {
  const days = getLast7Days()
  const todayKey = dayKey(new Date())

  const dayLabels: DayLabel[] = days.map((d) => {
    const date = new Date(d + 'T12:00:00')
    return {
      short: date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      isToday: d === todayKey,
    }
  })

  // Count 'done' events per agentId per day
  const heatmap: Record<string, Record<string, number>> = {}
  for (const evt of events) {
    if (evt.type !== 'done' || !evt.agentId) continue
    const dk = dayKey(new Date(evt.timestamp))
    if (!heatmap[evt.agentId]) heatmap[evt.agentId] = {}
    heatmap[evt.agentId][dk] = (heatmap[evt.agentId][dk] ?? 0) + 1
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div
        className="flex items-center justify-between mb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>
          Activity Heatmap
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            color: '#475569',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          7-day task completions per agent
        </span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '480px' }}>
          {/* Day headers */}
          <div className="flex items-center mb-2" style={{ paddingLeft: '128px', gap: '4px' }}>
            {dayLabels.map((dl, i) => (
              <div
                key={days[i]}
                className="flex-1 flex flex-col items-center"
                style={{ minWidth: 0 }}
              >
                <span
                  style={{
                    fontSize: '0.55rem',
                    color: dl.isToday ? 'var(--active)' : '#475569',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    fontWeight: dl.isToday ? 600 : 400,
                  }}
                >
                  {dl.short}
                </span>
                <span
                  style={{
                    fontSize: '0.5rem',
                    color: dl.isToday ? 'var(--active)' : '#334155',
                  }}
                >
                  {dl.date}
                </span>
              </div>
            ))}
          </div>

          {/* Agent rows */}
          <div className="flex flex-col gap-1.5">
            {agents.map((agent) => {
              const agentData = heatmap[agent.id] ?? {}
              const weekTotal = Object.values(agentData).reduce((s, n) => s + n, 0)

              return (
                <div key={agent.id} className="flex items-center" style={{ gap: '4px' }}>
                  <div
                    className="flex-shrink-0 flex items-center justify-between"
                    style={{ width: '124px' }}
                  >
                    <span
                      className="truncate"
                      style={{
                        fontSize: '0.62rem',
                        color: weekTotal > 0 ? '#94a3b8' : '#475569',
                        letterSpacing: '0.01em',
                      }}
                      title={agent.name}
                    >
                      {agent.name}
                    </span>
                    {weekTotal > 0 && (
                      <span style={{ fontSize: '0.5rem', color: '#334155', flexShrink: 0, marginLeft: '4px' }}>
                        {weekTotal}
                      </span>
                    )}
                  </div>

                  {days.map((day, dayIdx) => {
                    const count = agentData[day] ?? 0
                    return (
                      <HeatCell
                        key={day}
                        count={count}
                        agentName={agent.name}
                        dayLabel={dayLabels[dayIdx]}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span style={{ fontSize: '0.55rem', color: '#334155' }}>Less</span>
            {[0, 1, 3, 6].map((n) => (
              <div
                key={n}
                className="rounded-sm"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: getCellColor(n),
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              />
            ))}
            <span style={{ fontSize: '0.55rem', color: '#334155' }}>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatCell({
  count,
  agentName,
  dayLabel,
}: {
  count: number
  agentName: string
  dayLabel: DayLabel
}) {
  const [hover, setHover] = useState(false)

  return (
    <div className="relative flex-1" style={{ minWidth: 0 }}>
      <div
        className="rounded-sm w-full"
        style={{
          height: '20px',
          backgroundColor: getCellColor(count),
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'default',
          transition: 'opacity 0.1s',
          opacity: hover ? 0.8 : 1,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      />
      {hover && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1e2535',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            padding: '5px 8px',
            whiteSpace: 'nowrap',
            fontSize: '0.65rem',
            color: '#e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ color: '#94a3b8' }}>{agentName}</span>
          <span style={{ color: '#475569' }}> · </span>
          <span style={{ color: count > 0 ? 'var(--active)' : '#475569' }}>
            {count} task{count !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#475569' }}>
            {' '}
            on {dayLabel.short} {dayLabel.date}
          </span>
        </div>
      )}
    </div>
  )
}
