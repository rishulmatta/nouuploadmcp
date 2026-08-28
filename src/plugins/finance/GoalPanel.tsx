import { useEffect, useMemo, useState } from 'react'
import { listCommits } from '../../core/storage/commits'
import { loadMemory, saveMemory, type Adjustment, type Goal, type Plan } from '../../core/storage/memory'
import { categorizeTransaction } from './mappings'
import { monthsToGoal, projectionSeries } from '../../core/planner/project'
import type { Transaction } from './schema'

function currentMonthlyByCategory(txs: Transaction[]) {
  const map = new Map<string, number>()
  for (const tx of txs) {
    if (tx.amount >= 0) continue
    const { category } = categorizeTransaction(tx)
    map.set(category, (map.get(category) ?? 0) + Math.abs(tx.amount))
  }
  return map
}

export default function GoalPanel() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [goal, setGoal] = useState<Goal>({ label: 'Car', target: 40000, current: 6200, rate: 0 })
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    listCommits().then(setTxs)
    loadMemory().then((plan) => {
      if (plan) {
        setGoal(plan.goal)
        setAdjustments(plan.adjustments)
        setNote(plan.note ?? '')
      }
    })
  }, [])

  const months = useMemo(() => monthsToGoal(goal, adjustments), [goal, adjustments])
  const series = useMemo(() => projectionSeries(goal, adjustments, 48), [goal, adjustments])

  const spend = currentMonthlyByCategory(txs)

  const propose = () => {
    const proposed: Adjustment[] = []
    if ((spend.get('Dining out') ?? 0) > 0) {
      proposed.push({
        category: 'Dining out',
        currentMonthly: Math.round((spend.get('Dining out') ?? 0) * 100) / 100,
        targetMonthly: 250,
        rationale: 'Highest discretionary category in your data',
      })
    }
    if ((spend.get('Subscriptions') ?? 0) > 0) {
      proposed.push({
        category: 'Subscriptions',
        currentMonthly: Math.round((spend.get('Subscriptions') ?? 0) * 100) / 100,
        targetMonthly: Math.round(((spend.get('Subscriptions') ?? 0) * 0.5) * 100) / 100,
        rationale: 'Several recurring charges detected',
      })
    }
    setAdjustments(proposed)
  }

  const updateAdjustment = (i: number, targetMonthly: number) => {
    setAdjustments((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], targetMonthly }
      return next
    })
  }

  const save = async () => {
    await saveMemory({ goal, adjustments, note })
  }

  return (
    <div className="card col">
      <h3>Savings goal</h3>
      <div className="row">
        <label>Goal</label>
        <input value={goal.label} onChange={(e) => setGoal({ ...goal, label: e.target.value })} />
        <label>Target £</label>
        <input type="number" value={goal.target} onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })} />
        <label>Current £</label>
        <input type="number" value={goal.current} onChange={(e) => setGoal({ ...goal, current: Number(e.target.value) })} />
        <label>Rate %</label>
        <input type="number" value={goal.rate} onChange={(e) => setGoal({ ...goal, rate: Number(e.target.value) })} />
      </div>

      <p className="pill">{isFinite(months) ? `${months} months to goal` : 'Adjustments must free up monthly savings'}</p>

      <button onClick={propose}>Propose plan from my data</button>

      {adjustments.length > 0 && (
        <>
          <div className="sliders col">
            {adjustments.map((a, i) => (
              <div key={a.category} className="slider-row row">
                <span style={{ width: 140 }}>{a.category}</span>
                <span className="muted">£{a.currentMonthly.toFixed(2)}</span>
                <input
                  type="range"
                  min={0}
                  max={a.currentMonthly}
                  step={5}
                  value={a.targetMonthly}
                  onChange={(e) => updateAdjustment(i, Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span>£{a.targetMonthly.toFixed(2)}</span>
                <span className="muted" style={{ maxWidth: 220 }}>{a.rationale}</span>
              </div>
            ))}
          </div>
          <ProjectionChart series={series} target={goal.target} />
          <textarea placeholder="Notes (e.g. not cutting the gym)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="primary" onClick={save}>Save plan</button>
        </>
      )}

      <p className="muted">Projections are arithmetic on your own data. Not financial advice.</p>
    </div>
  )
}

function ProjectionChart({ series, target }: { series: number[]; target: number }) {
  const width = 600
  const height = 160
  const padding = 30
  const chartW = width - padding * 2
  const chartH = height - padding * 2
  const max = Math.max(target, ...series)
  const points = series.map((v, i) => {
    const x = padding + (i / (series.length - 1)) * chartW
    const y = height - padding - (v / max) * chartH
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 600 }}>
      <line x1={padding} y1={height - padding - (target / max) * chartH} x2={width - padding} y2={height - padding - (target / max) * chartH} stroke="var(--accent)" strokeDasharray="4" />
      <polyline points={points} fill="none" stroke="var(--accent-2)" strokeWidth={2} />
      <text x={width - padding} y={height - padding - (target / max) * chartH - 5} textAnchor="end" fill="var(--accent)" fontSize={10}>Target</text>
    </svg>
  )
}
