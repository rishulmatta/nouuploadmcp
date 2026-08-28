export default function Disclosures() {
  return (
    <div className="container col">
      <h1>Disclosures</h1>

      <section className="card">
        <h2>What this app does with your files</h2>
        <p>Your PDFs are read and stored <strong>inside this browser tab</strong>, using your browser's local storage. They are never transmitted to us or to anyone else. There is no backend, no account, and no server that could receive them. You can verify this: open your browser's network panel and use the app.</p>
      </section>

      <section className="card">
        <h2>What the agent receives</h2>
        <p>When an agent asks for data, this page checks your disclosure settings and either returns the data, refuses, or asks you. Text you authorize is passed to the agent you have connected — and from that point it is handled under <strong>that agent provider's</strong> terms and privacy policy, not ours.</p>
        <p>The audit log records every such disclosure so you can see exactly what was shared and when.</p>
      </section>

      <section className="card">
        <h2>What we collect</h2>
        <p>Nothing. No accounts, no analytics, no telemetry, no error reporting, no cookies beyond what's needed to keep the page working.</p>
      </section>

      <section className="card">
        <h2>Not financial advice</h2>
        <p>This app performs arithmetic on figures extracted from your own statements. Projections show what happens if you save a given amount each month at a rate you set yourself. They are not forecasts, recommendations, or personalised financial advice. No feature recommends financial products, investments, or allocations.</p>
      </section>

      <section className="card">
        <h2>Not medical advice</h2>
        <p>This app organises and charts results extracted from your own lab reports. Nothing here is a diagnosis, interpretation, or treatment recommendation. Discuss your results with a qualified clinician.</p>
      </section>

      <section className="card">
        <h2>Accuracy and your responsibility</h2>
        <p>Data is extracted from your PDFs by an AI agent and is <strong>not guaranteed to be correct</strong>. That is why nothing is saved until you approve it against the source page, and why every stored value links back to the page it came from.</p>
      </section>

      <section className="card">
        <h2>Software warranty</h2>
        <p>Released under the MIT License. Provided "as is", without warranty of any kind. See LICENSE in the repository.</p>
      </section>

      <section className="card">
        <h2>Third-party components</h2>
        <p>PDF rendering uses Mozilla's pdf.js (Apache 2.0). No other third-party service is contacted at runtime.</p>
      </section>

      <section className="card">
        <h2>Scope</h2>
        <p>Text-layer PDFs only; scanned documents are not supported. Single user, single device — no accounts, sync, or sharing.</p>
      </section>
    </div>
  )
}
