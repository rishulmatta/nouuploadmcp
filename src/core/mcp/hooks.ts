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
