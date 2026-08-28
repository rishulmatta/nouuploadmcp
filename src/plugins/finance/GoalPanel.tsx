import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { listCommits } from '../../core/storage/commits'
import { getProposals, subscribe, updateProposal } from '../../core/staging/store'
import { loadMemory, saveMemory, clearMemory, setLivePlan, type Adjustment, type Goal, type GoalKind, type Plan } from '../../core/storage/memory'
import { loadApprovedMappings } from './mappings'
import { currencySymbol, avgMonthlySpendByCategory, spendSummary } from './analytics'
import {
  monthsToGoal, projectionSeries, monthlyContribution, weeklyFromMonthly,
  maxMonthlyContribution, scaleAdjustmentsToTotal,
} from '../../core/planner/project'
import type { Transaction } from './schema'

const BLANK_GOAL = (kind: GoalKind): Goal => ({ kind, label: '', target: 0, current: 0, rate: 0 })

function RequiredSavings({ adjustments, cur, isDebt }: { adjustments: Adjustment[]; cur: string; isDebt: boolean }) {
  const monthly = monthlyContribution(adjustments)
  if (monthly <= 0) return null
  const weekly = weeklyFromMonthly(monthly)
  return (
    <p className="pill">
      {isDebt ? 'Pay' : 'Save'} <strong>{cur}{weekly.toFixed(2)}/week</strong> ({cur}{monthly.toFixed(2)}/month) under this plan
    </p>
  )
}

/** Warns when a plan asks for more than the account's actual average monthly
 *  surplus can support — the thing a slider alone can't tell you. Live and
 *  always visible (pure arithmetic on committed data + the current plan), the
 *  same way the cashflow chart is — the agent's get_plan_feasibility tool reads
 *  these same numbers to say the same thing back in chat. */
function FeasibilityNote({ requiredMonthly, avgMonthlySurplus, cur }: { requiredMonthly: number; avgMonthlySurplus: number; cur: string }) {
  if (requiredMonthly <= 0) return null
  const feasible = requiredMonthly <= avgMonthlySurplus
  return (
    <div className={feasible ? 'badge-yes' : 'badge-no'}>
      <span>{feasible ? '✅ Feasible' : '❌ Not feasible'}</span>
      <span style={{ fontWeight: 400 }}>
        {feasible
          ? `— within your average monthly surplus of ${cur}${avgMonthlySurplus.toFixed(2)}.`
          : `— needs ${cur}${requiredMonthly.toFixed(2)}/month but your average surplus is only ${cur}${avgMonthlySurplus.toFixed(2)}/month, a shortfall of ${cur}${(requiredMonthly - avgMonthlySurplus).toFixed(2)}.`}
      </span>
    </div>
  )
}

/** A single slider that drives the plan's total monthly contribution, scaling
 *  every per-category adjustment proportionally. Lets a human tune "$1000/mo"
 *  down to "$800/mo" without hand-editing each category. */
function TotalMonthlySlider({ adjustments, cur, isDebt, onChange }: {
  adjustments: Adjustment[]
  cur: string
  isDebt: boolean
  onChange: (adjustments: Adjustment[]) => void
}) {
  const monthly = monthlyContribution(adjustments)
  const weekly = weeklyFromMonthly(monthly)
  const max = Math.max(maxMonthlyContribution(adjustments), 1)

  return (
    <div className="card col" style={{ background: 'var(--surface-2)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span>{isDebt ? 'Extra payment toward balance' : 'Total monthly savings'}</span>
        <strong>{cur}{weekly.toFixed(2)}/week ({cur}{monthly.toFixed(2)}/month)</strong>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={5}
        value={monthly}
        onChange={(e) => onChange(scaleAdjustmentsToTotal(adjustments, Number(e.target.value)))}
        style={{ width: '100%' }}
      />
      <span className="muted">Drag to tune the total — per-category amounts below scale with it.</span>
    </div>
  )
}

export default function GoalPanel() {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [note, setNote] = useState('')
  const [rejectNote, setRejectNote] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [advancedOverride, setAdvancedOverride] = useState<boolean | null>(null)

  const planProposals = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getProposals('plan'),
    () => [],
  )
  const pendingPlan = useMemo(() => planProposals.filter((p) => p.status === 'pending').at(-1), [planProposals])

  useEffect(() => {
    const load = () => { loadApprovedMappings().then(() => listCommits()).then(setTxs) }
    load()
    loadMemory().then((plan) => {
      if (plan) {
        setGoal(plan.goal)
        setAdjustments(plan.adjustments)
        setNote(plan.note ?? '')
      }
      setLoaded(true)
    })
    return subscribe(load)
  }, [])

  // Mirror every change to the in-memory live-plan slot synchronously, so a
  // tool call landing right after a slider drag never reads a stale value —
  // and separately debounce the durable disk copy (survives a reload).
  useEffect(() => {
    if (!loaded) return
    setLivePlan(goal ? { goal, adjustments, note } : null)
  }, [loaded, goal, adjustments, note])

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!loaded || !goal) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { saveMemory({ goal, adjustments, note }) }, 400)
    return () => clearTimeout(saveTimer.current)
  }, [loaded, goal, adjustments, note])

  const months = goal ? monthsToGoal(goal, adjustments) : Infinity
  const series = goal ? projectionSeries(goal, adjustments, 48) : []

  const spend = avgMonthlySpendByCategory(txs)
  const avgMonthlySurplus = spendSummary(txs).avgMonthlySurplus
  const isDebt = goal?.kind === 'debt'
  const cur = currencySymbol(txs)
  // Interest rate is essential to a loan's math, so it's always visible there.
  // For a plain savings goal it's an optional what-if, collapsed by default
  // unless a plan already set one (e.g. proposed by the agent).
  const showRate = isDebt || (advancedOverride ?? ((goal?.rate ?? 0) !== 0))

  const startGoal = (kind: GoalKind) => {
    setGoal(BLANK_GOAL(kind))
    setAdjustments([])
    setNote('')
    setAdvancedOverride(null)
  }

  const clearGoal = () => {
    setGoal(null)
    setAdjustments([])
    setNote('')
    setAdvancedOverride(null)
    clearMemory()
  }

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

  const acceptPlanProposal = () => {
    if (!pendingPlan) return
    const plan = pendingPlan.payload as Plan
    setGoal(plan.goal)
    setAdjustments(plan.adjustments)
    setNote(plan.note ?? '')
    setAdvancedOverride(null)
    updateProposal(pendingPlan.id, { status: 'accepted' })
  }

  const rejectPlanProposal = () => {
    if (!pendingPlan) return
    updateProposal(pendingPlan.id, { status: 'rejected', note: rejectNote })
    setRejectNote('')
  }

  const boundsMax = goal ? Math.max(goal.target, goal.current, 1000) * 2 : 2000

  return (
    <div className="col">
      {pendingPlan && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <p className="pill">Agent proposed a {(pendingPlan.payload as Plan).goal.kind === 'debt' ? 'repayment' : 'savings'} plan · {((pendingPlan.payload as Plan).adjustments).length} adjustment(s)</p>
          <p><strong>{(pendingPlan.payload as Plan).goal.label}</strong> — {(pendingPlan.payload as Plan).goal.kind === 'debt' ? 'payoff' : 'target'} {cur}{(pendingPlan.payload as Plan).goal.target}, current {cur}{(pendingPlan.payload as Plan).goal.current}, rate {(pendingPlan.payload as Plan).goal.rate ?? 0}%</p>
          <ul>
            {(pendingPlan.payload as Plan).adjustments.map((a) => (
              <li key={a.category}>{a.category}: {cur}{a.currentMonthly.toFixed(2)} → {cur}{a.targetMonthly.toFixed(2)} — <span className="muted">{a.rationale}</span></li>
            ))}
          </ul>
          <RequiredSavings adjustments={(pendingPlan.payload as Plan).adjustments} cur={cur} isDebt={(pendingPlan.payload as Plan).goal.kind === 'debt'} />
          <FeasibilityNote requiredMonthly={monthlyContribution((pendingPlan.payload as Plan).adjustments)} avgMonthlySurplus={avgMonthlySurplus} cur={cur} />
          <div className="row">
            <button className="primary" onClick={acceptPlanProposal}>Accept proposal</button>
            <input placeholder="Rejection note" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} style={{ flex: 1 }} />
            <button onClick={rejectPlanProposal}>Reject</button>
          </div>
        </div>
      )}

      {!goal ? (
        <div className="col">
          <p className="muted">No goal set yet. Ask your agent for a plan (it can call <code>propose_savings_plan</code> or <code>propose_repayment_plan</code>), or start one yourself:</p>
          <div className="row">
            <button onClick={() => startGoal('savings')}>New savings goal</button>
            <button onClick={() => startGoal('debt')}>New loan repayment</button>
          </div>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: '1rem', justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: '1rem' }}>
              <label className="row" style={{ gap: '0.35rem' }}>
                <input type="radio" checked={!isDebt} onChange={() => setGoal({ ...goal, kind: 'savings' })} /> Savings goal
              </label>
              <label className="row" style={{ gap: '0.35rem' }}>
                <input type="radio" checked={isDebt} onChange={() => setGoal({ ...goal, kind: 'debt' })} /> Loan repayment
              </label>
            </div>
            <button onClick={clearGoal}>Clear goal</button>
          </div>

          <div className="col">
            <label>Goal</label>
            <input placeholder={isDebt ? 'e.g. Credit card' : 'e.g. House deposit'} value={goal.label} onChange={(e) => setGoal({ ...goal, label: e.target.value })} />

            <NumberSlider
              label={isDebt ? `Payoff target ${cur}` : `Target ${cur}`}
              value={goal.target}
              min={0}
              max={boundsMax}
              step={100}
              onChange={(v) => setGoal({ ...goal, target: v })}
            />
            <NumberSlider
              label={isDebt ? `Outstanding balance ${cur}` : `Current ${cur}`}
              value={goal.current}
              min={0}
              max={boundsMax}
              step={100}
              onChange={(v) => setGoal({ ...goal, current: v })}
            />

            {showRate ? (
              <NumberSlider
                label={isDebt ? 'Interest rate % APR' : 'Assumed annual return %'}
                value={goal.rate ?? 0}
                min={0}
                max={30}
                step={0.25}
                onChange={(v) => setGoal({ ...goal, rate: v })}
              />
            ) : (
              <button className="ghost" onClick={() => setAdvancedOverride(true)} style={{ alignSelf: 'flex-start' }}>
                + Assume an investment return (optional)
              </button>
            )}
            {!isDebt && showRate && (
              <button className="ghost" onClick={() => { setAdvancedOverride(false); setGoal({ ...goal, rate: 0 }) }} style={{ alignSelf: 'flex-start' }}>
                Not assuming a return — plain cash savings
              </button>
            )}
          </div>

          <div>
            <span className="stat">
              {isFinite(months) ? months : '—'}
              <span className="stat-label">
                {isFinite(months)
                  ? `months to ${isDebt ? 'pay off' : 'goal'}`
                  : isDebt
                    ? 'payment must exceed the monthly interest cost to make progress'
                    : 'adjustments must free up monthly savings'}
              </span>
            </span>
          </div>

          <button onClick={propose}>Draft adjustments from my spending</button>

          {adjustments.length > 0 && (
            <>
              <TotalMonthlySlider adjustments={adjustments} cur={cur} isDebt={isDebt} onChange={setAdjustments} />
              <FeasibilityNote requiredMonthly={monthlyContribution(adjustments)} avgMonthlySurplus={avgMonthlySurplus} cur={cur} />
              <div className="sliders col">
                {adjustments.map((a, i) => (
                  <div key={a.category} className="slider-row row">
                    <span style={{ width: 140 }}>{a.category}</span>
                    <span className="muted">{cur}{a.currentMonthly.toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={a.currentMonthly}
                      step={5}
                      value={a.targetMonthly}
                      onChange={(e) => updateAdjustment(i, Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span>{cur}{a.targetMonthly.toFixed(2)}</span>
                    <span className="muted" style={{ maxWidth: 220 }}>{a.rationale}</span>
                  </div>
                ))}
              </div>
              <ProjectionChart series={series} target={goal.target} />
              <textarea placeholder="Notes (e.g. not cutting the gym)" value={note} onChange={(e) => setNote(e.target.value)} />
              <p className="muted">Synced — your agent can read this plan back with <code>get_plan</code>.</p>
            </>
          )}

          <p className="muted">Projections are arithmetic on your own data. Not financial advice.</p>
        </>
      )}
    </div>
  )
}

function NumberSlider({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="slider-row row">
      <span style={{ width: 190 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 90 }}
      />
    </div>
  )
}

function ProjectionChart({ series, target }: { series: number[]; target: number }) {
  const width = 600
  const height = 160
  const padding = 30
  const chartW = width - padding * 2
  const chartH = height - padding * 2
  const max = Math.max(target, ...series, 1)
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
