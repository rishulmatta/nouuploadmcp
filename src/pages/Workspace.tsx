import { useParams } from 'react-router-dom'
import { useAppState } from '../core/state'
import { useEffect, useState } from 'react'
import StepCard from '../ui/StepCard'
import FinanceFlow from '../plugins/finance/FinanceFlow'
import LabsFlow from '../plugins/labs/LabsFlow'

export default function Workspace() {
  const { plugin } = useParams<{ plugin: string }>()
  const { documents, loadDocument, removeDocument, setPlugin } = useAppState()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

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
      e.target.value = ''
    }
  }

  return (
    <div className="container col">
      <h1>{plugin === 'finance' ? 'Financial statements' : plugin === 'labs' ? 'Blood test reports' : 'Workspace'}</h1>

      <StepCard
        n={1}
        title={plugin === 'labs' ? 'Upload your lab reports' : 'Upload your statements'}
        subtitle={plugin === 'labs' ? '2–3 reports is plenty — they stay in this browser tab, nothing is uploaded' : 'Stays in this browser tab, nothing is uploaded'}
      >
        <div className="row">
          <input type="file" multiple accept=".pdf,application/pdf" onChange={onFileChange} disabled={loading} />
        </div>
        {message && <p className="pill">{message}</p>}
        {documents.length === 0 ? (
          <p className="muted">No documents yet.</p>
        ) : (
          <ul>
            {documents.map((d) => (
              <li key={d.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>
                  {d.name} · {d.pageCount} page{d.pageCount === 1 ? '' : 's'} · {(d.size / 1024).toFixed(1)} KB
                </span>
                <button className="ghost" onClick={() => removeDocument(d.id)} disabled={loading}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </StepCard>

      {plugin === 'finance' && <FinanceFlow documents={documents} />}
      {plugin === 'labs' && <LabsFlow documents={documents} />}
    </div>
  )
}
