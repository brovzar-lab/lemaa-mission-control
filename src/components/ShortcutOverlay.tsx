import { useEffect } from 'react'

interface ShortcutOverlayProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Command palette'],
  ['N', 'New task'],
  ['B', 'Filter blocked'],
  ['A', 'Scroll to office'],
  ['T', 'Focus pipeline'],
  ['H', 'Reset home'],
  ['R', 'Force refresh'],
  ['?', 'This overlay'],
  ['1-9', 'Focus agent'],
  ['Enter', 'Expand row / open drawer'],
  ['⌘↵', 'Submit form'],
  ['Esc', 'Close modal'],
]

export function ShortcutOverlay({ isOpen, onClose }: ShortcutOverlayProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' || e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(4,6,13,0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-[480px]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--accent-cyan)',
          boxShadow: 'var(--glow-cyan)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="section-label">KEYBOARD SHORTCUTS</h2>
          <button
            onClick={onClose}
            style={{ color: '#64748b', lineHeight: 1 }}
            className="hover:opacity-100 opacity-50 transition-opacity"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex justify-between items-center">
              <kbd
                className="mono text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--bg-elevated, rgba(255,255,255,0.06))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.7rem',
                }}
              >
                {key}
              </kbd>
              <span className="text-xs" style={{ color: 'var(--idle, #64748b)' }}>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
