import { useEffect, useState } from 'react'

const SIZE = 28
const STROKE = 2.5
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface Props {
  intervalMs: number
  lastUpdatedAt: number
  isRefreshing: boolean
}

export function RefreshCountdownRing({ intervalMs, lastUpdatedAt, isRefreshing }: Props) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - lastUpdatedAt
      setProgress(Math.min(elapsed / intervalMs, 1))
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [intervalMs, lastUpdatedAt])

  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const color = isRefreshing ? '#22d3ee' : progress > 0.85 ? '#f59e0b' : '#334155'

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: SIZE, height: SIZE }}
      title={isRefreshing ? 'Refreshing…' : `Next refresh in ${Math.ceil(((1 - progress) * intervalMs) / 1000)}s`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
        />
        {/* Progress arc */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Center icon: spinning dots when refreshing, refresh icon otherwise */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isRefreshing ? (
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#22d3ee' }}
          />
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            style={{ color: progress > 0.85 ? '#f59e0b' : '#475569' }}
          >
            <path
              d="M5 1.5A3.5 3.5 0 1 1 1.5 5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M1.5 3V5H3.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
