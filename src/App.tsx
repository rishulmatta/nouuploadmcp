import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Workspace from './pages/Workspace'
import Audit from './pages/Audit'
import Grants from './pages/Grants'
import Tools from './pages/Tools'
import HowItWorks from './pages/HowItWorks'
import Disclosures from './pages/Disclosures'
import AgentStatusPill from './ui/AgentStatusPill'
import ConsentCard from './ui/ConsentCard'
import { useRegisterTools } from './core/mcp'
import { coreTools } from './core/mcp/coreTools'
import { buildDocumentTools } from './core/mcp/documentTools'
import { financeTools } from './plugins/finance/tools'
import { useAppState } from './core/state'
import { useMemo } from 'react'

function App() {
  const { plugin } = useAppState()
  const documentTools = useMemo(() => buildDocumentTools(plugin), [plugin])
  const pluginTools = useMemo(() => (plugin === 'finance' ? financeTools : []), [plugin])
  useRegisterTools(coreTools)
  useRegisterTools(documentTools)
  useRegisterTools(pluginTools)
  return (
    <div className="app">
      <header className="chrome">
        <div className="container row" style={{ justifyContent: 'space-between' }}>
          <Link to="/" className="wordmark">No Upload</Link>
          <AgentStatusPill />
        </div>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:plugin/*" element={<Workspace />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/grants" element={<Grants />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/disclosures" element={<Disclosures />} />
        </Routes>
      </main>
      <footer className="chrome">
        <div className="container row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>Nothing uploaded · 0 bytes sent to any server · <Link to="/audit">Audit log</Link></span>
          <span>
            <Link to="/how-it-works">How it works</Link> ·
            <Link to="/tools">Tool reference</Link> ·
            <Link to="/disclosures">Disclosures</Link> ·
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
          </span>
        </div>
      </footer>
      <ConsentCard />
    </div>
  )
}

export default App
