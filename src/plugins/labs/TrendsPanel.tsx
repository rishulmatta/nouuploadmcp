import { useEffect, useState } from 'react'
import { listResults } from '../../core/storage/labResults'
import { listApprovedRanges } from '../../core/storage/ranges'
import { subscribe } from '../../core/staging/store'
import type { LabResult, ApprovedReferenceRange } from './schema'

function effectiveRange(rows: LabResult[], approved: ApprovedReferenceRange[]) {
  const first = rows[0]
  if (first.referenceLow !== undefined || first.referenceHigh !== undefined) {
    return { low: first.referenceLow, high: first.referenceHigh, source: 'report' as const }
  }
  const match = approved.find((a) => a.analyte === first.analyte)
  if (match) return { low: match.low, high: match.high, source: 'standard' as const }
  return { low: undefined, high: undefined, source: undefined }
}

export default function TrendsPanel() {
  const [results, setResults] = useState<LabResult[]>([])
  const [approved, setApproved] = useState<ApprovedReferenceRange[]>([])

  useEffect(() => {
    const load = () => {
      listResults().then(setResults)
      listApprovedRanges().then(setApproved)
    }
    load()
    return subscribe(load)
  }, [])

  const byAnalyte = new Map<string, LabResult[]>()
  for (const r of results) {
    if (!byAnalyte.has(r.analyte)) byAnalyte.set(r.analyte, [])
    byAnalyte.get(r.analyte)!.push(r)
  }

  return (
    <div className="col">
      {byAnalyte.size === 0 ? (
        <p className="muted">No committed results yet — accept some proposals above.</p>
      ) : (
        Array.from(byAnalyte.entries()).map(([analyte, rows]) => {
          const sorted = rows.slice().sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
          const range = effectiveRange(sorted, approved)
          return (
            <div key={analyte} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h4>{analyte}</h4>
                <span className="muted">
                  {range.low !== undefined || range.high !== undefined
                    ? `ref ${range.low ?? '—'}–${range.high ?? '—'} ${rows[0].unit} (${range.source === 'standard' ? 'standard' : 'from your report'})`
                    : 'no reference range'}
                </span>
              </div>
              <SeriesChart points={sorted.map((r) => ({ date: r.date ?? '', value: r.value }))} low={range.low} high={range.high} />
            </div>
          )
        })
      )}
    </div>
  )
}

function SeriesChart({ points, low, high }: { points: { date: string; value: number }[]; low?: number; high?: number }) {
  if (points.length === 0) return null
  const width = 600
  const height = 160
  const padding = 30
  const chartW = width - padding * 2
  const chartH = height - padding * 2
  const values = points.map((p) => p.value)
  const allValues = [...values, ...(low !== undefined ? [low] : []), ...(high !== undefined ? [high] : [])]
  const max = Math.max(...allValues)
  const min = Math.min(0, Math.min(...allValues))
  const range = max - min || 1
  const toY = (v: number) => padding + chartH - ((v - min) / range) * chartH
  const toX = (i: number) => padding + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW)

  const line = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 600 }}>
      {low !== undefined && high !== undefined && (
        <rect x={padding} y={toY(high)} width={chartW} height={Math.max(0, toY(low) - toY(high))} fill="var(--accent-2)" opacity={0.12} />
      )}
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2} />
      {points.map((p, i) => {
        const outOfRange = (low !== undefined && p.value < low) || (high !== undefined && p.value > high)
        return (
          <g key={p.date + i}>
            <circle cx={toX(i)} cy={toY(p.value)} r={4} fill={outOfRange ? 'var(--danger)' : 'var(--accent)'} />
            <text x={toX(i)} y={height - 8} textAnchor="middle" fill="var(--muted)" fontSize={9}>{p.date}</text>
          </g>
        )
      })}
    </svg>
  )
}
