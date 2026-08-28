import { useParams } from 'react-router-dom'
import { useAppState } from '../core/state'
import { useEffect, useState } from 'react'
import { registry } from '../core/mcp'
import ReviewPanel from '../plugins/finance/ReviewPanel'
import ChartsPanel from '../plugins/finance/ChartsPanel'
import GoalPanel from '../plugins/finance/GoalPanel'

const FIXTURE_BASE = '/fixtures/finance/'

export default function Workspace() {
  const { plugin } = useParams<{ plugin: string }>()
  const { documents, loadDocument, setPlugin } = useAppState()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (plugin === 'finance' || plugin === 'labs') {
      setPlugin(plugin)
    }
  }, [plugin, setPlugin])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setLoading(true)
    try {
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        await loadDocument(file.name, bytes)
      }
      setMessage(`Loaded ${files.length} document(s).`)
    } catch (err) {
      setMessage(String(err))
    } finally {
      setLoading(false)
    }
  }

  const loadSamples = async () => {
    if (plugin !== 'finance') return
    setLoading(true)
    try {
      const months = [
        '2025-09', '2025-10', '2025-11', '2025-12',
        '2026-01', '2026-02', '2026-03', '2026-04',
        '2026-05', '2026-06', '2026-07', '2026-08',
      ]
      for (const m of months) {
        const res = await fetch(`${FIXTURE_BASE}statement-${m}.pdf`)
        const bytes = new Uint8Array(await res.arrayBuffer())
        await loadDocument(`statement-${m}.pdf`, bytes)
      }
      setMessage('Loaded 12 sample statements.')
    } catch (err) {
      setMessage(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container col">
      <h1>{plugin === 'finance' ? 'Financial statements' : plugin === 'labs' ? 'Blood test reports' : 'Workspace'}</h1>
      <div className="card col">
        <p>Drop PDFs here or load samples. Files are stored locally in your browser.</p>
        <div className="row">
          <input type="file" multiple accept=".pdf,application/pdf" onChange={onFileChange} disabled={loading} />
          {plugin === 'finance' && <button onClick={loadSamples} disabled={loading}>Load samples</button>}
        </div>
        {message && <p className="pill">{message}</p>}
      </div>

      <div className="card">
        <h3>Loaded documents</h3>
        {documents.length === 0 ? (
          <p className="muted">No documents yet.</p>
        ) : (
          <ul>
            {documents.map((d) => (
              <li key={d.id}>
                {d.name} · {d.pageCount} page{d.pageCount === 1 ? '' : 's'} · {(d.size / 1024).toFixed(1)} KB
              </li>
            ))}
          </ul>
        )}
      </div>

      {plugin === 'finance' && documents.length > 0 && (
        <div className="card row">
          <button onClick={async () => {
            setLoading(true)
            try {
              const result = await registry.invoke('propose_transactions', { doc: 'all' })
              setMessage(`Proposed ${(result as {proposed: number}).proposed} transactions.`)
              setReviewing(true)
            } catch (e) {
              setMessage(String(e))
            } finally {
              setLoading(false)
            }
          }} disabled={loading}>Extract transactions</button>
          <button onClick={() => setReviewing(!reviewing)}>{reviewing ? 'Hide review' : 'Review proposals'}</button>
        </div>
      )}

      {plugin === 'finance' && reviewing && <ReviewPanel />}
      {plugin === 'finance' && <ChartsPanel />}
      {plugin === 'finance' && <GoalPanel />}
    </div>
  )
}
