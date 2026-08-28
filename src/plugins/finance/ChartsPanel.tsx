import { useEffect, useState } from 'react'
import { listCommits } from '../../core/storage/commits'
import { categorizeTransaction } from './mappings'
import type { Transaction } from './schema'

function monthKey(date: string) {
  return date.slice(0, 7)
}

function groupByMonth(txs: Transaction[]) {
  const months = new Map<string, number>()
  for (const tx of txs) {
    const m = monthKey(tx.date)
    months.set(m, (months.get(m) ?? 0) + tx.amount)
  }
  return months
}

function groupSpendByCategory(txs: Transaction[]) {
  const cats = new Map<string, number>()
  for (const tx of txs) {
    if (tx.amount >= 0) continue
    const { category } = categorizeTransaction(tx)
    cats.set(category, (cats.get(category) ?? 0) + Math.abs(tx.amount))
  }
  return cats
}

export default function ChartsPanel() {
  const [txs, setTxs] = useState<Transaction[]>([])

  useEffect(() => {
    listCommits().then(setTxs)
  }, [])

  const monthly = Array.from(groupByMonth(txs).entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const categories = Array.from(groupSpendByCategory(txs).entries()).sort((a, b) => b[1] - a[1])

  return (
    <div className="card col">
      <h3>Insights</h3>
      {txs.length === 0 ? (
        <p>No committed transactions yet. Accept some proposals first.</p>
      ) : (
        <>
          <div className="card">
            <h4>Net cashflow by month</h4>
            <BarChart data={monthly} />
          </div>
          <div className="card">
            <h4>Spend by category</h4>
            <BarChart data={categories} />
          </div>
        </>
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
