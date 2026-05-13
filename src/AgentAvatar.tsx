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
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatRunDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
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

      {/* Avatar with animation */}
      <div
        className={`relative -mt-2 w-12 h-12 rounded-sm flex items-center justify-center text-sm font-bold select-none transition-[filter] duration-150 group-hover:brightness-125 ${
          isActive ? 'animate-bounce' : 'animate-float'
        }`}
        style={{
          backgroundColor: color + '33',
          border: `2px solid ${isBlocked ? '#f59e0b' : color}`,
          color,
          imageRendering: 'pixelated',
          outline: isBlocked ? '2px solid rgba(245,158,11,0.5)' : 'none',
          outlineOffset: '2px',
        }}
      >
        {initials}

        {/* Active pulse ring — 40% opacity per M7 */}
        {isActive && (
          <span
            className="absolute inset-0 rounded-sm animate-pulse_ring"
            style={{ border: `2px solid ${color}`, opacity: 0.4 }}
          />
        )}

        {/* H3: Blocked task warning badge */}
        {isBlocked && (
          <span
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: '#f59e0b',
              color: '#0f0f0f',
              fontSize: '0.5rem',
              lineHeight: 1,
              boxShadow: '0 0 6px rgba(245,158,11,0.6)',
            }}
          >
            !
          </span>
        )}
      </div>

      {/* Name label */}
      <div
        className="pixel-text text-center max-w-[80px] truncate"
        style={{ color, fontSize: '0.6rem' }}
        title={agent.name}
      >
        {agent.name}
      </div>

      {/* Status badge */}
      <div
        className="pixel-text max-w-[100px] truncate"
        style={{ fontSize: '0.5rem', color: isBlocked ? '#f59e0b' : isActive ? '#4ade80' : '#6b7280' }}
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
              style={{ color: isBlocked ? '#f59e0b' : '#4ade80', fontSize: '0.65rem' }}
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
