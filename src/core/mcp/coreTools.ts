import type { ToolSpec } from './types'

export const coreTools: ToolSpec[] = [
  {
    name: 'ping',
    description: 'A trivial tool to confirm the page is reachable by the agent.',
    parameters: [
      { name: 'message', type: 'string', description: 'Optional message to echo back.', required: false },
    ],
    tier: 'read',
    handler: ({ message }) => ({
      ok: true,
      pong: message ?? 'pong',
      ts: Date.now(),
    }),
  },
  {
    name: 'list_plugins',
    description: 'List available document plugins.',
    parameters: [],
    tier: 'read',
    handler: () => [
      { id: 'finance', label: 'Financial statements' },
      { id: 'labs', label: 'Blood test reports' },
    ],
  },
  {
    name: 'select_plugin',
    description: 'Switch the active plugin. This changes which tools are registered.',
    parameters: [
      { name: 'plugin', type: 'string', description: 'Plugin id: finance or labs', required: true, enum: ['finance', 'labs'] },
    ],
    tier: 'attention',
    handler: ({ plugin }) => {
      // TODO: wire to app state
      return { selected: plugin }
    },
  },
]
