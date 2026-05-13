import { create } from 'zustand'

interface Toast {
  id: string
  kind: 'success' | 'error'
  message: string
  onRetry?: () => void
}

interface ToastStore {
  toasts: Toast[]
  show: (kind: Toast['kind'], message: string, onRetry?: () => void) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (kind, message, onRetry) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message, onRetry }] }))
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      kind === 'success' ? 2000 : 5000,
    )
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().show('success', msg),
  error: (msg: string, onRetry?: () => void) => useToastStore.getState().show('error', msg, onRetry),
}
