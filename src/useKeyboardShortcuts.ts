import { useEffect } from 'react'

interface ShortcutHandlers {
  onNewTask: () => void
  onFilterBlocked: () => void
  onScrollOffice: () => void
  onFocusPipeline: () => void
  onResetHome: () => void
  onRefresh: () => void
  onToggleShortcuts: () => void
  onFocusAgent: (index: number) => void
  openPalette: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        (e.target as HTMLElement).isContentEditable
      )
        return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handlers.openPalette()
        return
      }

      switch (e.key) {
        case 'n':
        case 'N':
          handlers.onNewTask()
          break
        case 'b':
        case 'B':
          handlers.onFilterBlocked()
          break
        case 'a':
        case 'A':
          handlers.onScrollOffice()
          break
        case 't':
        case 'T':
          handlers.onFocusPipeline()
          break
        case 'h':
        case 'H':
          handlers.onResetHome()
          break
        case 'r':
        case 'R':
          handlers.onRefresh()
          break
        case '?':
          handlers.onToggleShortcuts()
          break
        default:
          if (e.key >= '1' && e.key <= '9') {
            handlers.onFocusAgent(parseInt(e.key) - 1)
          }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
