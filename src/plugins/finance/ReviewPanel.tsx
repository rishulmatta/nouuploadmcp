import { useSyncExternalStore, useState } from 'react'
import { getProposals, subscribe, type StagedProposal } from '../../core/staging/store'
import { acceptTransactionProposal, rejectTransactionProposal } from './tools'
import type { TransactionProposal } from './schema'

export default function ReviewPanel() {
  const proposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('transaction'),
    () => [],
  )

  const [note, setNote] = useState('')

  const handleAccept = async (id: string) => {
    await acceptTransactionProposal(id)
  }

  const handleReject = (id: string) => {
    rejectTransactionProposal(id, note)
    setNote('')
  }

  const pending = proposals.filter((p) => p.status === 'pending')

  return (
    <div className="card col">
      <h3>Review proposed transactions</h3>
      {pending.length === 0 ? (
        <p>No pending proposals. Ask the agent to extract transactions, or load samples and run <code>propose_transactions</code>.</p>
      ) : (
        <>
          <p className="pill">{pending.length} pending</p>
          <div className="review-list">
            {pending.slice(0, 20).map((p) => {
              const tx = p.payload as TransactionProposal
              return (
                <div key={p.id} className="review-item row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{tx.date}</strong> · {tx.description}<br />
                    <span className="muted">{tx.amount < 0 ? '' : '+'}{tx.amount.toFixed(2)} · balance {tx.balance?.toFixed(2) ?? '—'}</span>
                  </div>
                  <div className="row">
                    <button className="primary" onClick={() => handleAccept(p.id)}>Accept</button>
                    <button onClick={() => handleReject(p.id)}>Reject</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="row">
            <input placeholder="Rejection note (e.g. balance brought forward)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
          </div>
        </>
      )}
    </div>
  )
}
