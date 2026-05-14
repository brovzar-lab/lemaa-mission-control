import { motion } from 'framer-motion'

interface ParticleBurstProps {
  active: boolean
}

export function ParticleBurst({ active }: ParticleBurstProps) {
  if (!active) return null

  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * 360
        const rad = (angle * Math.PI) / 180
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: 'var(--aura-done, #34d399)',
              zIndex: 50,
              pointerEvents: 'none',
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * 24,
              y: Math.sin(rad) * 24,
              opacity: 0,
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )
      })}
    </>
  )
}
