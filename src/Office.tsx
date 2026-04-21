import type { Agent } from './types'
import { AgentAvatar } from './AgentAvatar'

interface Props {
  agents: Agent[]
}

export function Office({ agents }: Props) {
  const activeCount = agents.filter((a) => a.activeRun !== null).length

  return (
    <div className="flex flex-col items-center gap-8 w-full py-8">
      {/* Header stats */}
      <div className="flex gap-8 pixel-text" style={{ fontSize: '0.65rem' }}>
        <span style={{ color: '#94a3b8' }}>
          AGENTS: <span className="text-white">{agents.length}</span>
        </span>
        <span style={{ color: '#4ade80' }}>
          ACTIVE: <span className="text-white">{activeCount}</span>
        </span>
        <span style={{ color: '#6b7280' }}>
          IDLE: <span className="text-white">{agents.length - activeCount}</span>
        </span>
      </div>

      {/* Isometric office container */}
      <div
        className="relative w-full max-w-4xl"
        style={{ perspective: '1200px' }}
      >
        <div
          className="w-full"
          style={{
            transform: 'rotateX(30deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Floor */}
          <div
            className="w-full rounded-lg relative"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              border: '1px solid #334155',
              padding: '40px 32px 32px',
              minHeight: '280px',
            }}
          >
            {/* Floor grid lines */}
            <div
              className="absolute inset-0 rounded-lg opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />

            {/* Agent desks grid */}
            <div className="relative z-10 flex flex-wrap justify-center gap-6">
              {agents.map((agent, i) => (
                <div key={agent.id} className="relative">
                  <AgentAvatar agent={agent} index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Front wall shadow for depth */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 rounded-b-lg"
          style={{
            background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
            transform: 'translateY(8px) rotateX(0deg)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-6 pixel-text" style={{ fontSize: '0.55rem', color: '#475569' }}>
        <span>● ACTIVE = BOUNCING</span>
        <span>○ IDLE = FLOATING</span>
        <span>POLLS EVERY 5s</span>
      </div>
    </div>
  )
}
