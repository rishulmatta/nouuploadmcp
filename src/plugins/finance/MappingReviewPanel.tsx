import { useSyncExternalStore, useMemo } from 'react'
import { getProposals, subscribe } from '../../core/staging/store'
import { acceptMappingProposal, rejectMappingProposal } from './tools'
import type { CategoryMapping } from './schema'

// Rendered unconditionally (not behind the "Review proposals" toggle) — the agent
// can call propose_mapping at any time, independent of transaction review, so the
// approval UI for it can't be hidden behind that toggle too.
export default function MappingReviewPanel() {
  const mappingProposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('mapping'),
    () => [],
  )
  const pendingMappings = useMemo(() => mappingProposals.filter((p) => p.status === 'pending'), [mappingProposals])

  if (pendingMappings.length === 0) return null

  return (
    <div className="card col">
      <h3>Proposed category mappings</h3>
      <p className="muted">The agent read your actual transaction descriptions and proposed these rules. Approving one classifies every matching transaction, now and on future statements — nothing is applied until you approve.</p>
      <div className="col">
        {pendingMappings.map((p) => {
          const m = p.payload as CategoryMapping
          return (
            <div key={p.id} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
              <div>
                <strong>{m.merchant}</strong> → {m.category}<br />
                <span className="muted">matches "{m.pattern}" · {m.matchCount} transaction{m.matchCount === 1 ? '' : 's'}</span>
              </div>
              <div className="row">
                <button className="primary" onClick={() => acceptMappingProposal(p.id)}>Approve</button>
                <button onClick={() => rejectMappingProposal(p.id)}>Reject</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
