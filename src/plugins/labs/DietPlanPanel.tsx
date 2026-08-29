import { useEffect, useState, useSyncExternalStore } from 'react'
import { getProposals, subscribe, updateProposal } from '../../core/staging/store'
import { listResults } from '../../core/storage/labResults'
import { listApprovedRanges } from '../../core/storage/ranges'
import { loadDietMemory, saveDietMemory } from './memory'
import type { DietPlan, DietAdjustment, LabResult, ApprovedReferenceRange } from './schema'

const BLANK_ADJUSTMENT = (): DietAdjustment => ({ item: '', action: 'add', targetAnalyte: '', rationale: '' })
const BLANK_PLAN = (): DietPlan => ({ goal: { analyte: '', label: '', target: 0, current: 0, unit: '' }, adjustments: [] })

export default function DietPlanPanel() {
  const planProposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('plan'),
    () => [],
  )
  const pendingPlan = planProposals.filter((p) => p.status === 'pending').at(-1)

  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [results, setResults] = useState<LabResult[]>([])
  const [approved, setApproved] = useState<ApprovedReferenceRange[]>([])
  const [loaded, setLoaded] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  useEffect(() => {
    const load = () => {
      listResults().then(setResults)
      listApprovedRanges().then(setApproved)
    }
    load()
    loadDietMemory().then((saved) => {
      if (saved) setPlan(saved)
      setLoaded(true)
    })
    return subscribe(load)
  }, [])

  useEffect(() => {
    if (!loaded || !plan) return
    void saveDietMemory(plan)
  }, [loaded, plan])

  const outOfRange = results.filter((r) => {
    const range = r.referenceLow !== undefined || r.referenceHigh !== undefined
      ? { low: r.referenceLow, high: r.referenceHigh }
      : { low: approved.find((a) => a.analyte === r.analyte)?.low, high: approved.find((a) => a.analyte === r.analyte)?.high }
    return (range.low !== undefined && r.value < range.low) || (range.high !== undefined && r.value > range.high)
  })

  const acceptPlanProposal = () => {
    if (!pendingPlan) return
    const proposed = pendingPlan.payload as DietPlan
    setPlan(proposed)
    updateProposal(pendingPlan.id, { status: 'accepted' })
  }

  const rejectPlanProposal = () => {
    if (!pendingPlan) return
    updateProposal(pendingPlan.id, { status: 'rejected', note: rejectNote })
    setRejectNote('')
  }

  const updateGoalField = <K extends keyof DietPlan['goal']>(key: K, value: DietPlan['goal'][K]) => {
    setPlan((prev) => (prev ? { ...prev, goal: { ...prev.goal, [key]: value } } : prev))
  }

  const updateAdjustment = (i: number, patch: Partial<DietAdjustment>) => {
    setPlan((prev) => {
      if (!prev) return prev
      const next = [...prev.adjustments]
      next[i] = { ...next[i], ...patch }
      return { ...prev, adjustments: next }
    })
  }

  const addAdjustment = () => {
    setPlan((prev) => (prev ? { ...prev, adjustments: [...prev.adjustments, BLANK_ADJUSTMENT()] } : { ...BLANK_PLAN(), adjustments: [BLANK_ADJUSTMENT()] }))
  }

  const removeAdjustment = (i: number) => {
    setPlan((prev) => (prev ? { ...prev, adjustments: prev.adjustments.filter((_, idx) => idx !== i) } : prev))
  }

  return (
    <div className="col">
      <p className="muted">Ask the agent to call <code>find_out_of_range</code> then <code>propose_diet_plan</code>, or edit the plan directly below — this panel is the approval/amendment surface, not a source of medical advice.</p>

      {outOfRange.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {outOfRange.map((r) => (
            <span key={r.id} className="pill" style={{ color: 'var(--danger)' }}>{r.analyte}: {r.value} {r.unit}</span>
          ))}
        </div>
      )}

      {pendingPlan && (
        <div className="card col" style={{ borderColor: 'var(--accent)' }}>
          <p className="pill">Agent proposed a plan · {(pendingPlan.payload as DietPlan).adjustments.length} adjustment(s)</p>
          <p><strong>{(pendingPlan.payload as DietPlan).goal.label}</strong> ({(pendingPlan.payload as DietPlan).goal.analyte}) — target {(pendingPlan.payload as DietPlan).goal.target} {(pendingPlan.payload as DietPlan).goal.unit}, current {(pendingPlan.payload as DietPlan).goal.current} {(pendingPlan.payload as DietPlan).goal.unit}</p>
          <table className="audit-table">
            <thead>
              <tr><th>Item</th><th>Action</th><th>Targets analyte</th><th>Rationale</th></tr>
            </thead>
            <tbody>
              {(pendingPlan.payload as DietPlan).adjustments.map((a, i) => (
                <tr key={i}>
                  <td>{a.item}</td>
                  <td>{a.action}</td>
                  <td>{a.targetAnalyte}</td>
                  <td>{a.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <button className="primary" onClick={acceptPlanProposal}>Accept proposal</button>
            <input placeholder="Rejection note" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} style={{ flex: 1 }} />
            <button onClick={rejectPlanProposal}>Reject</button>
          </div>
        </div>
      )}

      {!plan ? (
        <div className="col">
          <p className="muted">No plan yet. Ask your agent for one, or start editing one yourself:</p>
          <button onClick={() => setPlan(BLANK_PLAN())}>Start a plan</button>
        </div>
      ) : (
        <div className="col">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Plan</h4>
            <button className="ghost" onClick={() => setPlan(null)}>Clear plan</button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <input placeholder="Goal label, e.g. Raise ferritin" value={plan.goal.label} onChange={(e) => updateGoalField('label', e.target.value)} style={{ flex: 2 }} />
            <input placeholder="Analyte, e.g. Ferritin" value={plan.goal.analyte} onChange={(e) => updateGoalField('analyte', e.target.value)} style={{ flex: 1 }} />
            <input type="number" placeholder="Target" value={plan.goal.target} onChange={(e) => updateGoalField('target', Number(e.target.value))} style={{ width: 90 }} />
            <input type="number" placeholder="Current" value={plan.goal.current} onChange={(e) => updateGoalField('current', Number(e.target.value))} style={{ width: 90 }} />
            <input placeholder="Unit" value={plan.goal.unit} onChange={(e) => updateGoalField('unit', e.target.value)} style={{ width: 80 }} />
          </div>

          <table className="audit-table">
            <thead>
              <tr><th>Item</th><th>Action</th><th>Targets analyte</th><th>Rationale</th><th /></tr>
            </thead>
            <tbody>
              {plan.adjustments.map((a, i) => (
                <tr key={i}>
                  <td><input value={a.item} onChange={(e) => updateAdjustment(i, { item: e.target.value })} style={{ width: '100%' }} /></td>
                  <td>
                    <select value={a.action} onChange={(e) => updateAdjustment(i, { action: e.target.value as DietAdjustment['action'] })}>
                      <option value="add">add</option>
                      <option value="reduce">reduce</option>
                      <option value="avoid">avoid</option>
                    </select>
                  </td>
                  <td><input value={a.targetAnalyte} onChange={(e) => updateAdjustment(i, { targetAnalyte: e.target.value })} style={{ width: '100%' }} /></td>
                  <td><input value={a.rationale} onChange={(e) => updateAdjustment(i, { rationale: e.target.value })} style={{ width: '100%' }} /></td>
                  <td><button className="ghost" onClick={() => removeAdjustment(i)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addAdjustment} style={{ alignSelf: 'flex-start' }}>+ Add item</button>
          <p className="muted">Saved automatically — your agent can read this back with <code>get_plan</code>.</p>
        </div>
      )}

      <p className="muted">No clinical interpretation, diagnosis, dosing, or supplement guidance is generated here — only dietary adjustments the agent proposes and you approve or edit.</p>
    </div>
  )
}
