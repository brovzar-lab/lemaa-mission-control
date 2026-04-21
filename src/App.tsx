import { useAgents } from './useAgents'
import { Office } from './Office'
import { isDemoMode, POLL_INTERVAL_MS } from './config'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="pixel-text text-cyan-400 text-lg animate-pulse">BOOTING MISSION CONTROL...</div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-cyan-400 animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2">
      <div className="pixel-text text-red-400 text-base">CONNECTION FAILED</div>
      <div className="pixel-text text-gray-500 text-xs max-w-sm text-center">{message}</div>
    </div>
  )
}

export default function App() {
  const { data: agents, isLoading, isError, error, dataUpdatedAt } = useAgents()

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '--:--:--'

  return (
    <div className="min-h-screen relative scanlines">
      {/* CRT header bar */}
      <header
        className="w-full px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0a0a16' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="pixel-text text-green-400" style={{ fontSize: '0.75rem' }}>
            PAPERCLIP MISSION CONTROL
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isDemoMode && (
            <span
              className="pixel-text px-2 py-0.5 rounded"
              style={{
                fontSize: '0.6rem',
                backgroundColor: '#7c3aed22',
                border: '1px solid #7c3aed',
                color: '#a78bfa',
              }}
            >
              DEMO MODE
            </span>
          )}
          <span className="pixel-text text-gray-600" style={{ fontSize: '0.6rem' }}>
            LAST SYNC: {lastUpdate}
          </span>
          <span className="pixel-text text-gray-600" style={{ fontSize: '0.6rem' }}>
            POLL: {POLL_INTERVAL_MS / 1000}s
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 pb-8">
        {isLoading && <LoadingScreen />}
        {isError && (
          <ErrorScreen
            message={error instanceof Error ? error.message : 'Unknown error'}
          />
        )}
        {agents && <Office agents={agents} />}
      </main>

      {/* CRT scanline footer */}
      <footer
        className="fixed bottom-0 w-full px-6 py-1 flex items-center justify-between"
        style={{ borderTop: '1px solid #1e293b', backgroundColor: '#0a0a16' }}
      >
        <span className="pixel-text text-gray-700" style={{ fontSize: '0.5rem' }}>
          BUILT WITH PAPERCLIP AGENTS
        </span>
        <span className="pixel-text text-gray-700" style={{ fontSize: '0.5rem' }}>
          {new Date().getFullYear()} LEMAA
        </span>
      </footer>
    </div>
  )
}
