import type { Issue } from '../types'

type HealthStatus = 'operational' | 'degraded' | 'critical'

function computeHealth(issues: Issue[]): HealthStatus {
  if (issues.length === 0) return 'operational'
  const blockedCount = issues.filter((i) => i.status === 'blocked').length
  const ratio = blockedCount / issues.length
  if (ratio > 0.3) return 'critical'
  if (ratio >= 0.1) return 'degraded'
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
  issues: Issue[]
}

export function HealthOrb({ issues }: Props) {
  const status = computeHealth(issues)
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
