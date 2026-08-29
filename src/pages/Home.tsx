import { Link } from 'react-router-dom'
import { useAgentDetected } from '../core/mcp'

const STARTER_PROMPTS = [
  'Extract the transactions from all my statements',
  'Categorise my spending and show me a pie chart',
  'I want to save $40,000 for a car — draft a plan',
  'Is this plan feasible given my real spending?',
]

const HOW_IT_WORKS = [
  'Load PDFs — stays in this tab',
  'Connect an agent to this page',
  'Ask in chat, review on screen',
  'Nothing saves until you approve',
]

const FINANCE_STEPS = [
  'Upload statements, accept transactions',
  'Spend chart + category breakdown',
  'Draft a savings plan, tune with sliders',
  'Ask "is this feasible?" for a real answer',
]

const LABS_STEPS = [
  'Upload 2–3 lab reports',
  'Trends plot automatically',
  'Ask what\'s off, and what diet would help',
  'Ask for a final review before you commit',
]

export default function Home() {
  const agentDetected = useAgentDetected()
  const copy = () => {
    navigator.clipboard.writeText(STARTER_PROMPTS.join('\n'))
  }

  return (
    <div className="container col" style={{ gap: '1.75rem' }}>
      {!agentDetected && (
        <div className="banner">
          <span>→</span>
          <span>No agent connected. Open this page inside <strong>Claude</strong>, <strong>Codex</strong>, or another WebMCP-enabled agent to drive it by chat.</span>
        </div>
      )}

      <section className="hero">
        <p className="eyebrow">Local-only · Zero upload</p>
        <h1>Let an agent read your documents.<br /><em>Without ever uploading them.</em></h1>
        <p className="sub">Your PDFs stay in this browser tab. You approve exactly what the agent sees, one request at a time.</p>
      </section>

      <section className="card">
        <h3 className="mt-0" style={{ marginTop: 0 }}>Driven by an agent, not clicks</h3>
        <div className="row" style={{ flexWrap: 'wrap', gap: '1.25rem', marginTop: '0.75rem' }}>
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s} className="row" style={{ gap: '0.6rem', flex: '1 1 200px', alignItems: 'flex-start' }}>
              <span className="step-badge" style={{ width: '1.5rem', height: '1.5rem', fontSize: '0.8rem' }}>{i + 1}</span>
              <span style={{ fontSize: '0.9rem' }}>{s}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tiles row" style={{ alignItems: 'stretch' }}>
        <div className="card col tile" style={{ flex: 1 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Financial statements</h2>
            <span className="pill">Start here</span>
          </div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Bank PDFs → categorised spending, a savings plan, and a feasibility check.</p>
          <ul style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, paddingLeft: '1.1rem' }}>
            {FINANCE_STEPS.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <Link to="/finance"><button className="primary">Start</button></Link>
        </div>

        <div className="card col tile" style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Blood test reports</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Lab PDFs → a verified timeline, a diet plan, and an adherence check.</p>
          <ul style={{ fontSize: '0.88rem', color: 'var(--muted)', margin: 0, paddingLeft: '1.1rem' }}>
            {LABS_STEPS.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <Link to="/labs"><button className="primary">Start</button></Link>
        </div>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Try saying to your agent…</h3>
        <ul style={{ margin: 0 }}>
          {STARTER_PROMPTS.map((p) => (
            <li key={p}>"{p}"</li>
          ))}
        </ul>
        <button onClick={copy} className="mt-1">Copy prompts</button>
      </section>

      <p className="privacy-strip">0 bytes uploaded — check your network panel and watch it stay empty.</p>
    </div>
  )
}
