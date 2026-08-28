import type { ToolSpec } from '../../core/mcp/types'

export const labsTools: ToolSpec[] = [
  {
    name: 'propose_results',
    description: 'Propose lab result rows from loaded reports. ( labs plugin — not yet wired )',
    parameters: [{ name: 'doc', type: 'string', description: 'Document id', required: true }],
    tier: 'staged',
    plugin: 'labs',
    handler: () => ({ proposed: 0, note: 'Labs plugin is a secondary plugin and is not fully wired in this build.' }),
  },
]
