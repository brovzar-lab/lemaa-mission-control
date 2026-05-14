interface EventTickerProps {
  events: string[]
}

export function EventTicker({ events }: EventTickerProps) {
  if (!events.length) return null
  const items = [...events, ...events]
  return (
    <div
      className="overflow-hidden flex-shrink-0"
      style={{
        height: 28,
        background: 'var(--bg-abyss)',
        borderBottom: '1px solid rgba(0,212,255,0.15)',
      }}
    >
      <div
        className="flex items-center gap-8 whitespace-nowrap section-label"
        style={{
          animation: 'ticker-scroll 30s linear infinite',
          width: 'max-content',
          height: '100%',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running' }}
      >
        {items.map((ev, i) => (
          <span key={i} className="px-4">
            <span style={{ color: 'var(--accent-cyan)', marginRight: 8 }}>◆</span>
            {ev}
          </span>
        ))}
      </div>
    </div>
  )
}
