interface HealthOrbProps {
  healthPercent: number
  isIncident: boolean
  onClick?: () => void
  pulseGreen?: boolean
}

export function HealthOrb({ healthPercent, isIncident, onClick, pulseGreen }: HealthOrbProps) {
  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick && isIncident ? 'Click to triage blocked issues' : undefined}
    >
      <div
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2px solid ${pulseGreen ? 'var(--aura-done)' : isIncident ? 'var(--aura-blocked)' : 'var(--aura-active)'}`,
          boxShadow: pulseGreen ? 'var(--glow-success)' : isIncident ? 'var(--glow-blocked)' : 'var(--glow-cyan)',
          animation: pulseGreen ? 'orb-pulse-green 0.8s ease-in-out 3' : undefined,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-abyss)' }} />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${healthPercent}%`,
            background: pulseGreen ? 'var(--aura-done)' : isIncident ? 'var(--aura-blocked)' : 'var(--aura-active)',
            opacity: 0.8,
            transition: 'height 600ms ease-in-out',
            animation: 'orb-wave 3s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 700,
            fontSize: '0.65rem',
            color: 'white',
            zIndex: 2,
          }}
        >
          {Math.round(healthPercent)}%
        </div>
        {isIncident && !pulseGreen && [0, 0.5, 1].map((delay) => (
          <div
            key={delay}
            style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '2px solid var(--aura-blocked)',
              animation: `orb-ripple 2s ease-out ${delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>
      <span className="section-label" style={{ fontSize: '0.5rem' }}>
        {isIncident ? 'INCIDENT' : 'HEALTH'}
      </span>
    </div>
  )
}
