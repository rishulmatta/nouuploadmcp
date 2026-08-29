import { useState, useSyncExternalStore } from 'react'
import { subscribeAdherence, getAdherenceSnapshot, reviewDietPlan, type AdherenceFlag } from './adherenceState'

const STATUS_LABEL: Record<AdherenceFlag['status'], string> = {
  resolved: '✅ Resolved',
  unresolved: '⚠️ Still out of range',
  'no-data': '⏳ No new data',
  uncovered: '🆕 Not covered by plan',
}
const STATUS_CLASS: Record<AdherenceFlag['status'], string> = {
  resolved: 'flag-resolved',
  unresolved: 'flag-unresolved',
  'no-data': 'muted',
  uncovered: 'flag-uncovered',
}

export default function AdherencePanel() {
  const snapshot = useSyncExternalStore(subscribeAdherence, getAdherenceSnapshot, () => null)
  const [busy, setBusy] = useState(false)

  const handleReview = async () => {
    setBusy(true)
    try {
      await reviewDietPlan()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button onClick={handleReview} disabled={busy}>{snapshot ? 'Review again' : 'Review now'}</button>
      </div>
      {!snapshot ? (
        <p className="muted">Not reviewed yet — ask the agent to do a final review (it'll call <code>review_diet_plan</code>), or click "Review now".</p>
      ) : snapshot.note ? (
        <p className="muted">{snapshot.note}</p>
      ) : (
        <div className="col">
          <h4 style={{ margin: 0 }}>Plan items reviewed</h4>
          {snapshot.adjustments.length === 0 ? <p className="muted">The plan has no items.</p> : (
            <table className="audit-table">
              <thead><tr><th>Item</th><th>Action</th><th>Claimed target</th><th>Rationale to verify</th></tr></thead>
              <tbody>{snapshot.adjustments.map((a, i) => (
                <tr key={`${a.item}-${i}`}><td>{a.item}</td><td>{a.action}</td><td>{a.targetAnalyte}</td><td>{a.rationale}</td></tr>
              ))}</tbody>
            </table>
          )}
          <h4 style={{ margin: 0 }}>Dietary claim findings</h4>
          {snapshot.findings.length === 0 ? (
            <p className="muted">Claims were not assessed in this review. Ask the agent for an evidence check.</p>
          ) : (
            <ul>
              {snapshot.findings.map((finding, i) => (
                <li key={`${finding.item}-${i}`} className={finding.status === 'supported' ? 'flag-resolved' : 'flag-unresolved'}>
                  <strong>{finding.item}</strong> — {finding.status}: {finding.note}
                </li>
              ))}
            </ul>
          )}
          <h4 style={{ margin: 0 }}>Agent review summary</h4>
          {snapshot.summary ? (
            <div className="review-summary">{snapshot.summary}</div>
          ) : (
            <p className="muted">No agent-written summary was included in this review.</p>
          )}
          <h4 style={{ margin: 0 }}>Lab result summary</h4>
          {snapshot.flags.length === 0 ? (
            <p className="muted">No result flags. Dietary claims above still require evidence checking.</p>
          ) : (
            <ul>
              {snapshot.flags.map((f) => (
                <li key={f.analyte} className={STATUS_CLASS[f.status]}>
                  <strong>{f.analyte}</strong> — {STATUS_LABEL[f.status]}
                  {f.latestValue !== undefined && (
                    <span className="muted"> · {f.latestValue} {f.unit}{f.referenceLow !== undefined || f.referenceHigh !== undefined ? ` (ref ${f.referenceLow ?? '—'}–${f.referenceHigh ?? '—'})` : ''}{f.date ? ` · ${f.date}` : ''}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
