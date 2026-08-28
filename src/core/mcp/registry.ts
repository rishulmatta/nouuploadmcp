import type { ToolSpec, ToolCall } from './types'

function parametersToInputSchema(parameters: ToolSpec['parameters']) {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const p of parameters) {
    properties[p.name] = {
      type: p.type,
      description: p.description,
      enum: p.enum,
    }
    if (p.required) required.push(p.name)
  }
  return {
    type: 'object',
    properties,
    required,
  }
}

function getModelContext(): { registerTool: (tool: unknown, options?: unknown) => void } | undefined {
  if (typeof window === 'undefined') return undefined
  const mc = (window as unknown as Record<string, unknown>).modelContext
    ?? (typeof document !== 'undefined' ? (document as unknown as Record<string, unknown>).modelContext : undefined)
    ?? (typeof navigator !== 'undefined' ? (navigator as unknown as Record<string, unknown>).modelContext : undefined)
  if (mc && typeof (mc as { registerTool?: unknown }).registerTool === 'function') {
    return mc as { registerTool: (tool: unknown, options?: unknown) => void }
  }
  return undefined
}

class Registry {
  private tools = new Map<string, ToolSpec>()
  private controllers = new Map<string, AbortController>()
  private calls: ToolCall[] = []
  private listeners = new Set<() => void>()
  private synced = false

  constructor() {
    if (typeof window !== 'undefined') {
      // Re-sync if modelContext appears after initial load. A host can inject
      // it well after the page loads (extension activation, switching into an
      // agent-enabled browser, joining a ChatGPT session later) — this page is
      // meant to sit open through an arbitrarily long human+agent session, so
      // this must never give up polling, or a late-arriving agent silently
      // never gets any tools registered and can never actually connect.
      const check = () => {
        if (getModelContext() && !this.synced) {
          this.syncAll()
        }
      }
      setInterval(check, 1000)
      window.addEventListener('focus', check)
      document.addEventListener('visibilitychange', check)
    }
  }

  register(spec: ToolSpec) {
    if (this.tools.has(spec.name)) {
      console.warn(`Tool ${spec.name} already registered; replacing.`)
      this.unregister(spec.name)
    }
    this.tools.set(spec.name, spec)
    this.syncToWindow(spec)
  }

  unregister(name: string) {
    this.tools.delete(name)
    const c = this.controllers.get(name)
    if (c) {
      c.abort()
      this.controllers.delete(name)
    }
  }

  clear() {
    for (const name of this.tools.keys()) this.unregister(name)
  }

  list(): ToolSpec[] {
    return Array.from(this.tools.values())
  }

  get(name: string): ToolSpec | undefined {
    return this.tools.get(name)
  }

  getCalls(): ToolCall[] {
    return this.calls.slice()
  }

  callCount(): number {
    return this.calls.length
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }

  async invoke(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) {
      const available = Array.from(this.tools.keys()).join(', ')
      throw new Error(`Tool not found: ${name}. Available tools: ${available}. If ${name} belongs to a plugin, call select_plugin first.`)
    }
    const start = performance.now()
    const result = await tool.handler(args)
    this.calls.push({
      ts: Date.now(),
      tool: name,
      args,
      result,
      durationMs: Math.round(performance.now() - start),
    })
    this.notify()
    return result
  }

  private syncAll() {
    for (const spec of this.tools.values()) {
      this.syncToWindow(spec)
    }
    this.synced = true
  }

  private syncToWindow(spec: ToolSpec) {
    const mc = getModelContext()
    if (!mc) return
    const c = this.controllers.get(spec.name)
    if (c) {
      c.abort()
    }
    const controller = new AbortController()
    this.controllers.set(spec.name, controller)
    const inputSchema = parametersToInputSchema(spec.parameters)
    mc.registerTool(
      {
        name: spec.name,
        description: spec.description,
        inputSchema,
        execute: async (input: Record<string, unknown>) => {
          return this.invoke(spec.name, input)
        },
      },
      { signal: controller.signal },
    )
  }
}

export const registry = new Registry()
