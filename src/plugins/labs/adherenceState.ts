import { listResults } from '../../core/storage/labResults'
import { listApprovedRanges } from '../../core/storage/ranges'
import { loadDietMemory } from './memory'
import type { LabResult, ApprovedReferenceRange, DietAdjustment } from './schema'

// Mirrors chartState.ts on the finance side: a final review of the approved
// diet plan against the latest results is interpretive (which results count as
// "the latest since the plan," which ranges apply), so — like spend-by-category —
// it only updates when explicitly reviewed, by the agent's review_diet_plan tool
// or a human clicking "Review now," never silently on every commit.

export interface AdherenceFlag {
  analyte: string
  status: 'resolved' | 'unresolved' | 'no-data' | 'uncovered'
  latestValue?: number
  unit?: string
  referenceLow?: number
  referenceHigh?: number
  date?: string
}

export interface DietReviewFinding {
  item: string
  status: 'supported' | 'questionable' | 'unsupported'
  note: string
}

export interface AdherenceSnapshot {
  flags: AdherenceFlag[]
  adjustments: DietAdjustment[]
  findings: DietReviewFinding[]
  summary?: string
  reviewedAt: number
  note?: string
}

let snapshot: AdherenceSnapshot | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeAdherence(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getAdherenceSnapshot(): AdherenceSnapshot | null {
  return snapshot
}

function effectiveRange(r: LabResult, approved: ApprovedReferenceRange[]): { low?: number; high?: number } {
  if (r.referenceLow !== undefined || r.referenceHigh !== undefined) return { low: r.referenceLow, high: r.referenceHigh }
  const match = approved.find((a) => a.analyte === r.analyte)
  return match ? { low: match.low, high: match.high } : {}
}

function isOutOfRange(value: number, range: { low?: number; high?: number }): boolean {
  if (range.low !== undefined && value < range.low) return true
  if (range.high !== undefined && value > range.high) return true
  return false
}

function targetAnalytes(target: string): string[] {
  return target
    .split(/\s*(?:,|&|\band\b|\/|;)\s*/i)
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function reviewDietPlan(findings: DietReviewFinding[] = [], summary?: string): Promise<AdherenceSnapshot> {
  const plan = await loadDietMemory()
  if (!plan) {
    snapshot = { flags: [], adjustments: [], findings: [], reviewedAt: Date.now(), note: 'No approved diet plan yet.' }
    notify()
    return snapshot
  }

  const results = await listResults()
  const approved = await listApprovedRanges()

  const latestByAnalyte = new Map<string, LabResult>()
  for (const r of results.slice().sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))) {
    latestByAnalyte.set(r.analyte, r)
  }

  const targeted = new Set(plan.adjustments.flatMap((a) => targetAnalytes(a.targetAnalyte)))
  const flags: AdherenceFlag[] = []

  for (const analyte of targeted) {
    const latest = latestByAnalyte.get(analyte)
    if (!latest) {
      flags.push({ analyte, status: 'no-data' })
      continue
    }
    const range = effectiveRange(latest, approved)
    flags.push({
      analyte,
      status: isOutOfRange(latest.value, range) ? 'unresolved' : 'resolved',
      latestValue: latest.value,
      unit: latest.unit,
      referenceLow: range.low,
      referenceHigh: range.high,
      date: latest.date,
    })
  }

  for (const [analyte, r] of latestByAnalyte) {
    if (targeted.has(analyte)) continue
    const range = effectiveRange(r, approved)
    if (isOutOfRange(r.value, range)) {
      flags.push({
        analyte,
        status: 'uncovered',
        latestValue: r.value,
        unit: r.unit,
        referenceLow: range.low,
        referenceHigh: range.high,
        date: r.date,
      })
    }
  }

  snapshot = { flags, adjustments: plan.adjustments, findings, summary, reviewedAt: Date.now() }
  notify()
  return snapshot
}
