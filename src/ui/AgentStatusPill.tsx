import { useEffect, useState } from 'react'
import { useCallCount } from '../core/mcp'

function getModelContext() {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as Record<string, unknown>).modelContext
    ?? (typeof document !== 'undefined' ? (document as unknown as Record<string, unknown>).modelContext : undefined)
    ?? (typeof navigator !== 'undefined' ? (navigator as unknown as Record<string, unknown>).modelContext : undefined)
}

export default function AgentStatusPill() {
  const calls = useCallCount()
  const [present, setPresent] = useState(false)

  useEffect(() => {
    const check = () => setPresent(getModelContext() !== undefined)
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [])

  if (!present) {
    return (
      <button className="pill ghost" onClick={() => alert('Connecting an agent\n\nOpen this page in ChatGPT\'s in-app browser, or in Chrome with WebMCP enabled, then ask your agent to work with your documents. No sign-in, no API key. This page works on its own too — load your PDFs and browse them without any agent.')}>
        <span style={{ color: 'var(--muted)' }}>○</span> No agent detected
      </button>
    )
  }
  if (calls === 0) {
    return <span className="pill"><span style={{ color: 'var(--warn)' }}>◐</span> Agent can connect</span>
  }
  return <span className="pill"><span style={{ color: 'var(--accent-2)' }}>●</span> Agent connected · {calls} calls</span>
}
