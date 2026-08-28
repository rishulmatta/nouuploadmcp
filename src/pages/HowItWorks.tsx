import { Link } from 'react-router-dom'

export default function HowItWorks() {
  return (
    <div className="container col">
      <h1>How it works</h1>

      <section className="card">
        <h2>The page owns three authorities</h2>
        <ul>
          <li><strong>Disclosure</strong> — nothing reaches the agent without a policy match or a human grant.</li>
          <li><strong>Commits</strong> — the agent proposes; only a human click writes.</li>
          <li><strong>Memory</strong> — state persists in the page across sessions; the agent is stateless.</li>
        </ul>
      </section>

      <section className="card">
        <h2>The five-stage pipeline</h2>
        <ol>
          <li><strong>Extract</strong> — read rows from PDFs.</li>
          <li><strong>Canonicalise</strong> — map messy merchant strings to clean categories.</li>
          <li><strong>Analyse</strong> — compute spend, recurring charges, savings rate.</li>
          <li><strong>Plan vs human goal</strong> — draft adjustments and let the human drag sliders.</li>
          <li><strong>Persist</strong> — approved goal + plan survive the session.</li>
        </ol>
      </section>

      <section className="card">
        <h2>WebMCP integration</h2>
        <p>Tools register on <code>document.modelContext</code>. The agent calls them by name. Every consent-gated call passes through middleware that either returns data, returns a structured refusal, or raises a card for you to decide.</p>
        <p>See the <Link to="/tools">tool reference</Link> and the <Link to="/audit">audit log</Link>.</p>
      </section>
    </div>
  )
}
