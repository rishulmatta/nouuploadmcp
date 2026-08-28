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
      ) : snapshot.flags.length === 0 ? (
        <p className="muted">No flags — everything the plan targets is either resolved or has no out-of-range results to worry about.</p>
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
  )
}
