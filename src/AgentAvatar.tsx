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
}

export function AgentAvatar({ agent, index }: Props) {
  const isActive = agent.activeRun !== null
  const color = getColor(agent.role)
  const initials = getInitials(agent.name)

  return (
    <div className="flex flex-col items-center gap-1 group" style={{ animationDelay: `${index * 0.15}s` }}>
      {/* Desk platform */}
      <div
        className="relative w-16 h-3 rounded-sm opacity-60"
        style={{ backgroundColor: '#4b3f2a', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      />

      {/* Avatar with animation */}
      <div
        className={`relative -mt-2 w-12 h-12 rounded-sm flex items-center justify-center text-sm font-bold select-none cursor-default ${
          isActive ? 'animate-bounce' : 'animate-float'
        }`}
        style={{
          backgroundColor: color + '33',
          border: `2px solid ${color}`,
          color,
          imageRendering: 'pixelated',
        }}
      >
        {initials}

        {/* Active pulse ring */}
        {isActive && (
          <span
            className="absolute inset-0 rounded-sm animate-pulse_ring"
            style={{ border: `2px solid ${color}` }}
          />
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
      <div className="pixel-text" style={{ fontSize: '0.5rem', color: isActive ? '#4ade80' : '#6b7280' }}>
        {isActive && agent.activeRun
          ? `● RUNNING ${formatRunDuration(agent.activeRun.startedAt)}`
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
          <div style={{ color: isActive ? '#4ade80' : '#6b7280' }}>
            {isActive ? 'Active run in progress' : 'Idle'}
          </div>
        </div>
      </div>
    </div>
  )
}
