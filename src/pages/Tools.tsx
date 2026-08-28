import { useTools } from '../core/mcp'

const tierColor: Record<string, string> = {
  read: 'var(--accent-2)',
  attention: 'var(--warn)',
  consent: 'var(--danger)',
  staged: 'var(--accent)',
  memory: 'var(--muted)',
}

export default function Tools() {
  const tools = useTools()

  return (
    <div className="container">
      <h1>Tool reference</h1>
      <p>Every tool the page exposes to the agent, rendered from the same registry used by <code>document.modelContext.registerTool()</code>.</p>
      <div className="tools-list col">
        {tools.map((t) => (
          <div key={t.name} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <code style={{ fontSize: '1.1rem' }}>{t.name}</code>
              <span className="pill" style={{ color: tierColor[t.tier] ?? 'inherit' }}>{t.tier}</span>
            </div>
            <p>{t.description}</p>
            {t.parameters.length > 0 && (
              <ul>
                {t.parameters.map((p) => (
                  <li key={p.name}>
                    <code>{p.name}</code> ({p.type}{p.required ? ', required' : ''}) — {p.description}
                    {p.enum && <span className="muted"> · enum: {p.enum.join(', ')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
