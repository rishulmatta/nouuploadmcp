import { useSyncExternalStore, useState, useMemo } from 'react'
import { getProposals, subscribe, type StagedProposal } from '../../core/staging/store'
import { acceptTransactionProposals, rejectTransactionProposals } from './tools'
import type { TransactionProposal } from './schema'

export default function ReviewPanel() {
  const proposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('transaction'),
    () => [],
  )

  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const pending = useMemo(() => proposals.filter((p) => p.status === 'pending'), [proposals])
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

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pending.map((p) => p.id)))
  }

  const handleAcceptSelected = async () => {
    const ids = pending.filter((p) => selected.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    setBusy(true)
    try {
      await acceptTransactionProposals(ids)
      setSelected(new Set())
    } finally {
      setBusy(false)
    }
  }

  const handleRejectSelected = () => {
    const ids = pending.filter((p) => selected.has(p.id)).map((p) => p.id)
    if (ids.length === 0) return
    rejectTransactionProposals(ids, note)
    setSelected(new Set())
    setNote('')
  }

  const handleAccept = async (id: string) => {
    setBusy(true)
    try {
      await acceptTransactionProposals([id])
    } finally {
      setBusy(false)
    }
  }

  const handleReject = (id: string) => {
    rejectTransactionProposals([id], note)
    setNote('')
  }

  return (
    <div className="col" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
      <p className="muted">Nothing here is visible to the agent until you Accept. Reject a row if extraction got it wrong — it clears the row and leaves your note for the agent to read; leaving a row unselected just leaves it pending, unseen either way.</p>
      {pending.length === 0 ? (
        <p>No pending proposals. Upload statements and ask the agent to extract transactions, or run <code>propose_transactions</code> yourself with "Extract transactions" above.</p>
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
          <div className="review-list" style={{ maxHeight: 480, overflowY: 'auto' }}>
            {pending.map((p) => {
              const tx = p.payload as TransactionProposal
              return (
                <div key={p.id} className="review-item row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
                  <div className="row" style={{ alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ marginTop: 4 }} />
                    <div>
                      <strong>{tx.date}</strong> · {tx.description}<br />
                      <span className="muted">{tx.amount < 0 ? '' : '+'}{tx.amount.toFixed(2)} · balance {tx.balance?.toFixed(2) ?? '—'}</span>
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
            <input placeholder="Rejection note (e.g. balance brought forward) — applies to selected/individual reject" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
          </div>
        </>
      )}
    </div>
  )
}

