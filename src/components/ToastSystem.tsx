import { useToastStore } from '../useToast'

export function ToastSystem() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: `3px solid ${t.kind === 'success' ? 'var(--success)' : 'var(--error)'}`,
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            animation: 'toast-slide-in 200ms ease-out',
            minWidth: '240px',
            maxWidth: '360px',
          }}
        >
          <span className="flex-1" style={{ color: '#e2e8f0' }}>{t.message}</span>
          {t.onRetry && (
            <button
              onClick={t.onRetry}
              className="text-xs underline flex-shrink-0"
              style={{ color: 'var(--error)' }}
            >
              Retry
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="flex-shrink-0 opacity-40 hover:opacity-80 transition-opacity ml-1"
            style={{ color: '#e2e8f0' }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
