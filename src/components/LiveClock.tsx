import { useState, useEffect } from 'react'

export function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span
      className="orbitron-gradient tabular"
      style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '0.08em' }}
    >
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </span>
  )
}
