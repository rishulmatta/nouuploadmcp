import { useSyncExternalStore, useMemo, useState, useEffect } from 'react'
import { getProposals, subscribe } from '../../core/staging/store'
import { acceptMappingProposal, rejectMappingProposal } from './tools'
import type { CategoryMapping } from './schema'
import { listApprovedMappings, setApprovedMappingEnabled, subscribeApprovedMappings } from '../../core/storage/mappings'
import { loadApprovedMappings } from './mappings'
import { renderSpendByCategory } from './chartState'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [approvedMappings, setApprovedMappings] = useState<CategoryMapping[]>([])

  useEffect(() => {
    const load = () => { listApprovedMappings().then(setApprovedMappings) }
    load()
    return subscribeApprovedMappings(load)
  }, [])
  const selectedIds = useMemo(
    () => pendingMappings.filter((proposal) => selected.has(proposal.id)).map((proposal) => proposal.id),
    [pendingMappings, selected],
  )
  const allSelected = pendingMappings.length > 0 && selectedIds.length === pendingMappings.length

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pendingMappings.map((proposal) => proposal.id)))
  }

  const approve = async (ids: string[]) => {
    if (ids.length === 0) return
    setBusy(true)
    try {
      // Mapping storage uses append semantics, so keep these writes ordered.
      for (const id of ids) await acceptMappingProposal(id)
      setSelected(new Set())
      await renderSpendByCategory()
    } finally {
      setBusy(false)
    }
  }

  const reject = (ids: string[]) => {
    for (const id of ids) rejectMappingProposal(id)
    setSelected(new Set())
  }

  const toggleApproved = async (mapping: CategoryMapping) => {
    setBusy(true)
    try {
      await setApprovedMappingEnabled(mapping.id, mapping.enabled === false)
      await loadApprovedMappings()
      await renderSpendByCategory()
    } finally {
      setBusy(false)
    }
  }

  if (pendingMappings.length === 0 && approvedMappings.length === 0) return null

  return (
    <div className="card col">
      <h3>Category mappings</h3>
      <p className="muted">Approved mappings remain here as active selections. Uncheck one to stop applying that rule and immediately update the pie chart.</p>
      {pendingMappings.length > 0 && <>
      <h4 style={{ marginBottom: 0 }}>Proposed</h4>
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <label className="row" style={{ gap: '0.5rem' }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={busy} />
          <span className="pill">{pendingMappings.length} pending · {selectedIds.length} selected</span>
        </label>
        <div className="row">
          <button className="primary" onClick={() => approve(selectedIds)} disabled={busy || selectedIds.length === 0}>
            Approve selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
          <button onClick={() => reject(selectedIds)} disabled={busy || selectedIds.length === 0}>
            Reject selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
        </div>
      </div>
      <div className="col" style={{ maxHeight: 480, overflowY: 'auto' }}>
        {pendingMappings.map((p) => {
          const m = p.payload as CategoryMapping
          return (
            <div key={p.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} disabled={busy} style={{ marginTop: 4 }} />
                <div>
                  <strong>{m.merchant}</strong> → {m.category}<br />
                  <span className="muted">matches "{m.pattern}" · {m.matchCount} transaction{m.matchCount === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="row">
                <button className="primary" onClick={() => approve([p.id])} disabled={busy}>Approve</button>
                <button onClick={() => reject([p.id])} disabled={busy}>Reject</button>
              </div>
            </div>
          )
        })}
      </div>
      </>}
      {approvedMappings.length > 0 && <>
        <h4 style={{ marginBottom: 0 }}>Approved</h4>
        <div className="col" style={{ maxHeight: 480, overflowY: 'auto' }}>
          {approvedMappings.map((mapping) => (
            <label key={mapping.id} className="row" style={{ alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '0.5rem 0' }}>
              <input type="checkbox" checked={mapping.enabled !== false} onChange={() => toggleApproved(mapping)} disabled={busy} style={{ marginTop: 4 }} />
              <span>
                <strong>{mapping.merchant}</strong> → {mapping.category}<br />
                <span className="muted">matches "{mapping.pattern}" · {mapping.enabled === false ? 'not included' : 'included in chart'}</span>
              </span>
            </label>
          ))}
        </div>
      </>}
    </div>
  )
}
