import { useEffect, useState, useSyncExternalStore } from 'react'
import { registry } from './registry'
import type { ToolSpec } from './types'

export function useRegisterTools(specs: ToolSpec[]) {
  useEffect(() => {
    for (const spec of specs) registry.register(spec)
    return () => {
      for (const spec of specs) registry.unregister(spec.name)
    }
  }, [specs])
}

export function useToolCalls() {
  return useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.getCalls(),
    () => [],
  )
}

export function useCallCount() {
  return useSyncExternalStore(
    (cb) => registry.subscribe(cb),
    () => registry.callCount(),
    () => 0,
  )
}

export function useTools() {
  const [tools, setTools] = useState(() => registry.list())
  useEffect(() => {
    return registry.subscribe(() => setTools(registry.list()))
  }, [])
  return tools
}

function getModelContext() {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as Record<string, unknown>).modelContext
    ?? (typeof document !== 'undefined' ? (document as unknown as Record<string, unknown>).modelContext : undefined)
    ?? (typeof navigator !== 'undefined' ? (navigator as unknown as Record<string, unknown>).modelContext : undefined)
}

export function useAgentDetected() {
  const [present, setPresent] = useState(false)
  useEffect(() => {
    const check = () => setPresent(getModelContext() !== undefined)
    check()
    const id = setInterval(check, 1000)
    return () => { clearInterval(id) }
  }, [])
  return present
}
