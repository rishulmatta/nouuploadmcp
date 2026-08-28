import { useEffect, useState, useSyncExternalStore } from 'react'
import { listCommits } from '../../core/storage/commits'
import { subscribe } from '../../core/staging/store'
import { groupByMonth } from './analytics'
import { subscribeCategoryChart, getCategoryChartSnapshot, renderSpendByCategory } from './chartState'
import type { Transaction } from './schema'

// Net cashflow is pure date arithmetic on committed transactions — no
// categorisation involved — so it's always safe to keep it live.
export function MonthlyCashflowChart() {
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(() => {
    const load = () => { listCommits().then(setTxs) }
    load()
    return subscribe(load)
  }, [])

  if (txs.length === 0) return <p>No committed transactions yet — accept some proposals first.</p>

  const monthly = Array.from(groupByMonth(txs).entries()).sort((a, b) => a[0].localeCompare(b[0]))
  return <BarChart data={monthly} />
}

// Spend by category depends on mappings that may still be in flux, so it only
// updates when explicitly rendered (by the agent's plot_spend_by_category tool,
// or the button below) — never silently on every commit change.
export function CategorySpendChart() {
  const [rendering, setRendering] = useState(false)
  const categorySnapshot = useSyncExternalStore(subscribeCategoryChart, getCategoryChartSnapshot, () => null)

  const handleRenderCategories = async () => {
    setRendering(true)
    try {
      await renderSpendByCategory()
    } finally {
      setRendering(false)
    }
  }

  return (
    <div className="col">
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button onClick={handleRenderCategories} disabled={rendering}>
          {categorySnapshot ? 'Re-render' : 'Render now'}
        </button>
      </div>
      {categorySnapshot ? (
        <PieChart data={categorySnapshot.data} />
      ) : (
        <p className="muted">Not rendered yet — this chart only updates when asked, since it depends on category mappings you may still be approving. Ask the agent to categorize your spending (it'll call <code>plot_spend_by_category</code>), or click "Render now".</p>
      )}
    </div>
  )
}

function BarChart({ data }: { data: [string, number][] }) {
  if (data.length === 0) return null
  const width = 600
  const height = 200
  const padding = { top: 10, right: 10, bottom: 60, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const max = Math.max(...data.map((d) => Math.abs(d[1])))
  const barWidth = chartWidth / data.length * 0.7
  const gap = chartWidth / data.length * 0.3

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 600 }}>
      {data.map((d, i) => {
        const val = d[1]
        const barHeight = (Math.abs(val) / max) * chartHeight
        const x = padding.left + i * (barWidth + gap) + gap / 2
        const y = padding.top + chartHeight - barHeight
        return (
          <g key={d[0]}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={val >= 0 ? 'var(--accent-2)' : 'var(--danger)'} rx={4} />
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fill="var(--muted)" fontSize={10} transform={`rotate(-45, ${x + barWidth / 2}, ${height - 10})`}>
              {d[0]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)']

function PieChart({ data }: { data: [string, number][] }) {
  const positive = data.filter(([, v]) => v > 0)
  if (positive.length === 0) return <p className="muted">Nothing to show — no categorised spend yet.</p>

  const total = positive.reduce((s, [, v]) => s + v, 0)
  const size = 220
  const radius = size / 2
  const cx = radius
  const cy = radius
  const toXY = (deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)]
  }

  let angle = -90
  const slices = positive.map(([label, value], i) => {
    const fraction = value / total
    const sweep = fraction * 360
    const startAngle = angle
    const endAngle = angle + sweep
    angle = endAngle
    const large = sweep > 180 ? 1 : 0
    const [x1, y1] = toXY(startAngle)
    const [x2, y2] = toXY(endAngle)
    const path = positive.length === 1
      ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
    return { label, value, path, color: PIE_COLORS[i % PIE_COLORS.length], fraction }
  })

  return (
    <div className="row" style={{ alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: '0 0 auto' }}>
        {slices.map((s) => (
          <path key={s.label} d={s.path} fill={s.color} stroke="var(--surface)" strokeWidth={1} />
        ))}
      </svg>
      <div className="col" style={{ gap: '0.35rem' }}>
        {slices.map((s) => (
          <div key={s.label} className="row" style={{ gap: '0.5rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: 'inline-block', flex: '0 0 auto' }} />
            <span>{s.label}</span>
            <span className="muted">{s.value.toFixed(2)} ({Math.round(s.fraction * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
