export type ToolTier = 'read' | 'attention' | 'consent' | 'staged' | 'memory'

export interface ToolParameter {
  name: string
  type: string
  description: string
  required?: boolean
  enum?: string[]
}

export interface ToolSpec {
  name: string
  description: string
  parameters: ToolParameter[]
  tier: ToolTier
  plugin?: string
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>
}

export interface ToolCall {
  ts: number
  tool: string
  args: Record<string, unknown>
  result: unknown
  durationMs: number
}
