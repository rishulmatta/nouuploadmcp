import { Link } from 'react-router-dom'

const STARTER_PROMPTS = [
  'Extract the transactions from all my statements',
  'Categorise my spending and show me a pie chart',
  'I want to save $40,000 for a car — draft a plan',
  'Is this plan feasible given my real spending?',
]

const FINANCE_STEPS = [
  'Upload statements — they stay in this tab',
  'Pick which transactions to accept',
  'A monthly spend chart appears automatically',
  'Ask the agent to categorise spending — get a pie chart',
  'Ask for a savings plan, tune it with sliders',
  'Ask "is this feasible?" — get a yes/no, backed by your real numbers',
]

const LABS_STEPS = [
  'Upload 2–3 lab reports',
  'Trends plot automatically',
  'Ask what you\'re deficient in, and what diet would help',
  'Amend the plan yourself, or ask the agent to revise it',
  'Ask for a final review — flags anything off-plan',
]

export default function Home() {
  const copy = () => {
    navigator.clipboard.writeText(STARTER_PROMPTS.join('\n'))
  }

  return (
    <div className="container col" style={{ gap: '1.5rem' }}>
      <section className="hero">
        <h1>Let an agent read your private documents without uploading them.</h1>
        <p className="sub">Your PDFs stay in this browser tab. You choose what the agent is allowed to see, one request at a time.</p>
      </section>

      <section className="card col">
        <h3>This page isn't clicked through — it's driven by an agent</h3>
        <p>Open this page, then point an agent (Codex, ChatGPT, Claude — anything that supports WebMCP) at this tab and talk to it in plain language. The page registers tools the agent can call directly against whatever's loaded here; nothing goes to a server. Your job is upload, then approve or reject what the agent proposes.</p>
        <ol>
          <li>Load your PDFs here — stored in this tab only, never uploaded</li>
          <li>Connect an agent to this page (see below)</li>
          <li>Ask it things in chat — it calls tools, you see the result on screen</li>
          <li>Nothing is saved until you click Accept or Approve</li>
        </ol>
        <div className="video-placeholder">Demo video coming soon</div>
      </section>

      <section className="tiles row" style={{ alignItems: 'stretch' }}>
        <div className="card col" style={{ flex: 1 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Financial statements</h2>
            <span className="pill">Start here</span>
          </div>
          <p>Turn months of bank PDFs into categorised spending, a savings plan, and a live feasibility check.</p>
          <ol style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {FINANCE_STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <Link to="/finance"><button className="primary">Start</button></Link>
        </div>

        <div className="card col" style={{ flex: 1 }}>
          <h2>Blood test reports</h2>
          <p>Turn years of lab PDFs into a verified timeline, a diet plan for what's off, and a final adherence check.</p>
          <ol style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {LABS_STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          <Link to="/labs"><button className="primary">Start</button></Link>
        </div>
      </section>

      <section className="card">
        <h3>Try saying to your agent…</h3>
        <ul>
          {STARTER_PROMPTS.map((p) => (
            <li key={p}>"{p}"</li>
          ))}
        </ul>
        <button onClick={copy}>Copy prompts</button>
      </section>

      <p className="privacy-strip">Nothing uploaded. Open your browser's network panel and watch it stay empty.</p>
    </div>
  )
}
