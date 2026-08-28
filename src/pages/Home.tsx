import { Link } from 'react-router-dom'

const STARTER_PROMPTS = [
  'Extract the transactions from all my statements',
  'Categorise my spending and show me where it went',
  'I want to save £40,000 for a car — how long?',
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

      <section className="tiles row" style={{ alignItems: 'stretch' }}>
        <div className="card col" style={{ flex: 1 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Financial statements</h2>
            <span className="pill">Start here</span>
          </div>
          <p>Turn months of bank PDFs into categorised spending, recurring-charge detection, and a savings plan you control.</p>
          <div className="row">
            <Link to="/finance"><button className="primary">Start</button></Link>
            <Link to="/finance"><button>Load samples</button></Link>
          </div>
        </div>

        <div className="card col" style={{ flex: 1 }}>
          <h2>Blood test reports</h2>
          <p>Turn years of lab PDFs into one verified timeline, with reference ranges shown and sourced.</p>
          <div className="row">
            <Link to="/labs"><button className="primary">Start</button></Link>
            <button disabled>Load samples</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>How it works</h3>
        <ol>
          <li>Load your PDFs — they're stored in this tab only</li>
          <li>Review what's masked before anything is shared</li>
          <li>The agent asks; you authorize each request</li>
          <li>Nothing is saved until you approve it</li>
        </ol>
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
