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

class Registry {
  private tools = new Map<string, ToolSpec>()
  private controllers = new Map<string, AbortController>()
  private calls: ToolCall[] = []
  private listeners = new Set<() => void>()

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
      throw new Error(`Tool not found: ${name}`)
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

  private syncToWindow(spec: ToolSpec) {
    if (typeof window === 'undefined') return
    const mc = window.modelContext
    if (!mc?.registerTool) return
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
