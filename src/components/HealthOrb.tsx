import type { Agent } from '../types'

const BLOCKED_ERROR_THRESHOLD = 0.3

type HealthStatus = 'operational' | 'degraded' | 'critical'

function computeHealth(agents: Agent[]): HealthStatus {
  if (agents.length === 0) return 'operational'

  const activeCount = agents.filter((a) => a.activeRun !== null).length
  const idleCount = agents.length - activeCount

  if (idleCount / agents.length > BLOCKED_ERROR_THRESHOLD) return 'degraded'
  if (activeCount === 0) return 'critical'
  return 'operational'
}

const HEALTH_CONFIG = {
  operational: {
    color: 'var(--active)',
    glow: 'var(--active-glow)',
    label: 'All Systems Operational',
    cssColor: '#22D3EE',
  },
  degraded: {
    color: 'var(--paused)',
    glow: 'var(--paused-glow)',
    label: 'Degraded',
    cssColor: '#F59E0B',
  },
  critical: {
    color: 'var(--error)',
    glow: 'var(--error-glow)',
    label: 'Critical',
    cssColor: '#F87171',
  },
}

interface Props {
  agents: Agent[]
}

export function HealthOrb({ agents }: Props) {
  const status = computeHealth(agents)
  const cfg = HEALTH_CONFIG[status]

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative"
        style={{ width: '10px', height: '10px' }}
      >
        {/* Radial glow */}
        <div
          className="absolute rounded-full"
          style={{
            inset: '-4px',
            backgroundColor: cfg.glow,
            borderRadius: '50%',
            filter: 'blur(4px)',
          }}
        />
        {/* Orb */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            backgroundColor: cfg.color,
            boxShadow: `0 0 8px 2px ${cfg.cssColor}88, 0 0 16px 4px ${cfg.cssColor}33`,
          }}
        />
      </div>
      <span
        className="pixel-text"
        style={{ fontSize: '0.55rem', color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  )
}
