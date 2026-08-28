import { useSyncExternalStore, useState, useMemo } from 'react'
import { getProposals, subscribe } from '../../core/staging/store'
import { acceptResultProposals, rejectResultProposals, acceptRangeProposal, rejectRangeProposal, standardRangeSuggestion } from './tools'
import type { LabResultProposal, ReferenceRangeProposal } from './schema'

export default function ReviewPanel() {
  const proposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('result'),
    () => [],
  )
  const rangeProposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('range'),
    () => [],
  )

  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const pending = useMemo(() => proposals.filter((p) => p.status === 'pending'), [proposals])
  const pendingRanges = useMemo(() => rangeProposals.filter((p) => p.status === 'pending'), [rangeProposals])
  const selectedCount = useMemo(() => pending.filter((p) => selected.has(p.id)).length, [pending, selected])
  const allSelected = pending.length > 0 && selectedCount === pending.length

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pending.map((p) => p.id)))

  const handleAcceptSelected = async () => {
    const ids = pending.filter((p) => selected.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    setBusy(true)
    try {
      await acceptResultProposals(ids)
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  const handleRejectSelected = () => {
    const ids = pending.filter((p) => selected.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    rejectResultProposals(ids, note)
    setSelected(new Set())
    setNote('')
  }

  const handleAccept = async (id: string) => {
    setBusy(true)
    try {
      await acceptResultProposals([id])
    } finally {
      setBusy(false)
    }
  }

  const handleReject = (id: string) => {
    rejectResultProposals([id], note)
    setNote('')
  }

  return (
    <div className="col" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
      <p className="muted">Nothing here is visible to the agent until you Accept. Reject a row if extraction got it wrong — it clears the row and leaves your note for the agent to read; leaving a row unselected just leaves it pending, unseen either way.</p>
      {pending.length === 0 ? (
        <p>No pending proposals. Upload lab reports and ask the agent to extract results, or run <code>propose_results</code> yourself with "Extract results" above.</p>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <label className="row" style={{ gap: '0.5rem' }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              <span className="pill">{pending.length} pending · {selectedCount} selected</span>
            </label>
            <div className="row">
              <button className="primary" onClick={handleAcceptSelected} disabled={busy || selectedCount === 0}>
                Accept selected {selectedCount > 0 ? `(${selectedCount})` : ''}
              </button>
              <button onClick={handleRejectSelected} disabled={busy || selectedCount === 0}>
                Reject selected {selectedCount > 0 ? `(${selectedCount})` : ''}
              </button>
            </div>
          </div>
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {pending.map((p) => {
              const r = p.payload as LabResultProposal
              const flagged = (r.referenceLow !== undefined && r.value < r.referenceLow) || (r.referenceHigh !== undefined && r.value > r.referenceHigh)
              return (
                <div key={p.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ marginTop: 4 }} />
                    <div>
                      <strong>{r.analyte}</strong> {r.panel ? <span className="muted">· {r.panel}</span> : null}<br />
                      <span className={flagged ? undefined : 'muted'} style={flagged ? { color: 'var(--danger)' } : undefined}>
                        {r.value} {r.unit}
                        {(r.referenceLow !== undefined || r.referenceHigh !== undefined) && (
                          <> · ref {r.referenceLow ?? '—'}–{r.referenceHigh ?? '—'}</>
                        )}
                        {r.date ? <> · {r.date}</> : null}
                      </span>
                    </div>
                  </div>
                  <div className="row">
                    <button className="primary" onClick={() => handleAccept(p.id)} disabled={busy}>Accept</button>
                    <button onClick={() => handleReject(p.id)} disabled={busy}>Reject</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="row">
            <input placeholder="Rejection note — applies to selected/individual reject" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
          </div>
        </>
      )}

      {pendingRanges.length > 0 && (
        <>
          <h4 className="mt-2">Proposed reference ranges</h4>
          <p className="muted">The report printed no range for these analytes; the agent proposed a cited standard. Nothing is applied until you approve.</p>
          <div className="col">
            {pendingRanges.map((p) => {
              const rr = p.payload as ReferenceRangeProposal
              const suggestion = standardRangeSuggestion(rr.analyte)
              return (
                <div key={p.id} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <div>
                    <strong>{rr.analyte}</strong>: {rr.low === -Infinity ? '—' : rr.low}–{rr.high === Infinity ? '—' : rr.high} {rr.unit}<br />
                    <span className="muted">Source: {rr.source} · Population: {rr.population}{suggestion ? ` · matches built-in default` : ''}</span><br />
                    <span className="muted">Reason: {rr.reason}</span>
                  </div>
                  <div className="row">
                    <button className="primary" onClick={() => acceptRangeProposal(p.id)}>Approve</button>
                    <button onClick={() => rejectRangeProposal(p.id)}>Reject</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
