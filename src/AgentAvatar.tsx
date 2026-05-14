import type { Agent } from './types'

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

function formatRunDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function getAuraStyle(status: string, isBlocked: boolean): React.CSSProperties {
  if (isBlocked || status === 'blocked') {
    return {
      boxShadow: '0 0 0 3px var(--aura-blocked), var(--glow-blocked)',
      animation: 'blocked-pulse 1.5s ease-in-out infinite',
      border: 'none',
    }
  }
  if (status === 'running' || status === 'active') {
    return {
      boxShadow: '0 0 0 3px var(--aura-active), var(--glow-cyan)',
      border: 'none',
    }
  }
  return {
    boxShadow: '0 0 0 2px var(--aura-idle)',
    border: 'none',
  }
}

interface Props {
  agent: Agent
  index: number
  onClick?: () => void
}

export function AgentAvatar({ agent, index, onClick }: Props) {
  const isActive = agent.activeRun !== null
  const isBlocked = agent.currentIssue?.status === 'blocked'
  const color = getColor(agent.role)
  const initials = getInitials(agent.name)
  const agentStatus = isBlocked ? 'blocked' : isActive ? 'active' : 'idle'

  return (
    <div
      className="flex flex-col items-center gap-1 group"
      style={{ animationDelay: `${index * 0.15}s`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      title={onClick ? 'Click for details' : undefined}
    >
      {/* Desk platform */}
      <div
        className="relative w-16 h-3 rounded-sm opacity-60"
        style={{ backgroundColor: '#4b3f2a', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      />

      {/* Avatar with aura ring */}
      <div
        className="relative -mt-2 select-none"
        style={{
          width: 48,
          height: 48,
          transition: 'transform 150ms ease',
          ...getAuraStyle(agentStatus, isBlocked),
          borderRadius: '50%',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)' }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold transition-[filter] duration-150 group-hover:brightness-125"
          style={{
            backgroundColor: color + '33',
            color: isBlocked ? 'var(--aura-blocked)' : isActive ? 'var(--accent-cyan)' : color,
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.65rem',
          }}
        >
          {initials}
        </div>

        {/* Role badge */}
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 18,
            height: 18,
            background: 'var(--accent-violet)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '0.55rem',
            fontWeight: 700,
            color: 'white',
            zIndex: 10,
          }}
        >
          {(agent.role ?? 'AG').slice(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Name label */}
      <div
        className="pixel-text text-center max-w-[80px] truncate"
        style={{
          color: isBlocked ? 'var(--aura-blocked)' : isActive ? 'var(--accent-cyan)' : 'var(--idle)',
          fontSize: '0.6rem',
        }}
        title={agent.name}
      >
        {agent.name}
      </div>

      {/* Status badge */}
      <div
        className="pixel-text max-w-[100px] truncate"
        style={{ fontSize: '0.5rem', color: isBlocked ? 'var(--aura-blocked)' : isActive ? '#4ade80' : '#6b7280' }}
        title={isActive && agent.currentIssue ? `${agent.currentIssue.identifier}: ${agent.currentIssue.title}` : undefined}
      >
        {isActive && agent.activeRun
          ? `${isBlocked ? '⚠ BLOCKED' : '● RUNNING'} ${formatRunDuration(agent.activeRun.startedAt)}${agent.currentIssue ? ` · ${agent.currentIssue.identifier}` : ''}`
          : '○ IDLE'}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div
          className="px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{ backgroundColor: '#1a1a2e', border: `1px solid ${color}`, color: '#e2e8f0' }}
        >
          <div className="font-bold">{agent.name}</div>
          {agent.title && <div style={{ color: '#94a3b8' }}>{agent.title}</div>}
          {isActive && agent.currentIssue && (
            <div
              className="truncate max-w-[200px]"
              style={{ color: isBlocked ? 'var(--aura-blocked)' : '#4ade80', fontSize: '0.65rem' }}
              title={`${agent.currentIssue.identifier}: ${agent.currentIssue.title}`}
            >
              {isBlocked ? '⚠ BLOCKED — ' : ''}{agent.currentIssue.identifier}: {agent.currentIssue.title}
            </div>
          )}
          {(!isActive || !agent.currentIssue) && (
            <div style={{ color: isActive ? '#4ade80' : '#6b7280' }}>
              {isActive ? 'Active run in progress' : 'Idle'}
            </div>
          )}
          <div style={{ color: '#475569', fontSize: '0.55rem', marginTop: '2px' }}>Click for details</div>
        </div>
      </div>
    </div>
  )
}
