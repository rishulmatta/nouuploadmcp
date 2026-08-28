import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Workspace from './pages/Workspace'
import Audit from './pages/Audit'
import Grants from './pages/Grants'
import Tools from './pages/Tools'
import HowItWorks from './pages/HowItWorks'
import Disclosures from './pages/Disclosures'
import AgentStatusPill from './ui/AgentStatusPill'
import StatusFooter from './ui/StatusFooter'
import ConsentCard from './ui/ConsentCard'
import { useRegisterTools } from './core/mcp'
import { buildCoreTools } from './core/mcp/coreTools'
import { buildDocumentTools } from './core/mcp/documentTools'
import { financeTools } from './plugins/finance/tools'
import { labsTools } from './plugins/labs/tools'
import { useAppState } from './core/state'
import { useMemo } from 'react'

function App() {
  const { plugin, setPlugin } = useAppState()
  const navigate = useNavigate()
  const coreTools = useMemo(
    () =>
      buildCoreTools((p) => {
        setPlugin(p)
        navigate(`/${p}`)
      }),
    [setPlugin, navigate],
  )
  const documentTools = useMemo(() => buildDocumentTools(plugin), [plugin])
  const pluginTools = useMemo(() => {
    if (plugin === 'finance') return financeTools
    if (plugin === 'labs') return labsTools
    return []
  }, [plugin])
  useRegisterTools(coreTools)
  useRegisterTools(documentTools)
  useRegisterTools(pluginTools)
  return (
    <div className="app">
      <header className="chrome">
        <div className="container row" style={{ justifyContent: 'space-between' }}>
          <Link to="/" className="wordmark">No Upload</Link>
          <div className="row" style={{ gap: '0.75rem' }}>
            <StatusFooter />
            <AgentStatusPill />
          </div>
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
