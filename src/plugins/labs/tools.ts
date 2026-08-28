import type { ToolSpec } from '../../core/mcp/types'
import { listDocuments, loadParsedPage } from '../../core/storage/documents'
import { stageProposal, getProposals, updateProposal } from '../../core/staging/store'
import { listResults, replaceResults } from '../../core/storage/labResults'
import { listApprovedRanges, approveRange } from '../../core/storage/ranges'
import { loadDietMemory } from './memory'
import { extractResultsFromPage } from './extract'
import type { LabResult, LabResultProposal, ReferenceRangeProposal, ApprovedReferenceRange, DietPlan, DietGoal, DietAdjustment } from './schema'
import { resultKey } from './schema'
import { standardRangeFor } from './mappings'
import { reviewDietPlan } from './adherenceState'

interface EffectiveRange {
  low?: number
  high?: number
  source?: 'report' | 'standard'
}

function effectiveRange(r: LabResult, approved: ApprovedReferenceRange[]): EffectiveRange {
  if (r.referenceLow !== undefined || r.referenceHigh !== undefined) {
    return { low: r.referenceLow, high: r.referenceHigh, source: 'report' }
  }
  const approvedRange = approved.find((a) => a.analyte === r.analyte)
  if (approvedRange) return { low: approvedRange.low, high: approvedRange.high, source: 'standard' }
  return {}
}

function isOutOfRange(value: number, range: EffectiveRange): boolean {
  if (range.low !== undefined && value < range.low) return true
  if (range.high !== undefined && value > range.high) return true
  return false
}

export const labsTools: ToolSpec[] = [
  {
    name: 'propose_results',
    description: 'Scan loaded lab reports and propose result rows for human review.',
    parameters: [
      { name: 'doc', type: 'string', description: 'Document id, or "all" for all loaded documents', required: true },
    ],
    tier: 'staged',
    plugin: 'labs',
    handler: async ({ doc }) => {
      const owned = await listDocuments('labs')
      const docs = doc === 'all' ? owned : owned.filter((d) => d.id === String(doc))
      const proposals: LabResultProposal[] = []
      for (const d of docs) {
        for (let p = 1; p <= d.pageCount; p++) {
          const page = await loadParsedPage(d.id, p)
          if (!page) continue
          proposals.push(...extractResultsFromPage(d.id, page))
        }
      }
      const seen = new Set<string>()
      const unique = proposals.filter((p) => {
        const key = resultKey(p)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      for (const p of unique) {
        stageProposal({ id: resultKey(p), type: 'result', payload: p })
      }
      return { proposed: unique.length, sample: unique.slice(0, 3) }
    },
  },
  {
    name: 'get_review_status',
    description: 'Get the current state of staged result proposals, including accept/reject notes.',
    parameters: [],
    tier: 'read',
    plugin: 'labs',
    handler: () => {
      const pending = getProposals('result').filter((p) => p.status === 'pending')
      const accepted = getProposals('result').filter((p) => p.status === 'accepted')
      const rejected = getProposals('result').filter((p) => p.status === 'rejected')
      return {
        pending: pending.length,
        accepted: accepted.length,
        rejected: rejected.length,
        rejectedWithNotes: rejected.map((p) => ({ id: p.id, note: p.note })),
      }
    },
  },
  {
    name: 'propose_reference_range',
    description: 'Propose a standard reference range for an analyte the report printed no range for. Staged until a human approves it; never applied silently.',
    parameters: [
      { name: 'analyte', type: 'string', description: 'Canonical analyte name', required: true },
      { name: 'low', type: 'number', description: 'Lower bound', required: false },
      { name: 'high', type: 'number', description: 'Upper bound', required: false },
      { name: 'unit', type: 'string', description: 'Unit', required: true },
      { name: 'source', type: 'string', description: 'Cited source, e.g. "Mayo Clinic Laboratories"', required: true },
      { name: 'population', type: 'string', description: 'Population the range applies to, e.g. "adult male"', required: true },
      { name: 'reason', type: 'string', description: 'Why this fallback is being proposed', required: true },
    ],
    tier: 'staged',
    plugin: 'labs',
    handler: ({ analyte, low, high, unit, source, population, reason }) => {
      const proposal: ReferenceRangeProposal = {
        analyte: String(analyte),
        low: low === undefined ? Number.NEGATIVE_INFINITY : Number(low),
        high: high === undefined ? Number.POSITIVE_INFINITY : Number(high),
        unit: String(unit),
        source: String(source),
        population: String(population),
        reason: String(reason),
      }
      const id = stageProposal({ id: `range-${String(analyte)}-${Date.now()}`, type: 'range', payload: proposal })
      return { proposed: true, id }
    },
  },
  {
    name: 'list_series',
    description: 'List accepted lab results grouped by analyte, as time series with the effective reference range for each.',
    parameters: [],
    tier: 'read',
    plugin: 'labs',
    handler: async () => {
      const results = await listResults()
      const approved = await listApprovedRanges()
      const byAnalyte = new Map<string, LabResult[]>()
      for (const r of results) {
        if (!byAnalyte.has(r.analyte)) byAnalyte.set(r.analyte, [])
        byAnalyte.get(r.analyte)!.push(r)
      }
      return Array.from(byAnalyte.entries()).map(([analyte, rows]) => {
        const range = effectiveRange(rows[0], approved)
        return {
          analyte,
          unit: rows[0].unit,
          panel: rows[0].panel,
          referenceLow: range.low,
          referenceHigh: range.high,
          referenceSource: range.source,
          points: rows
            .slice()
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map((r) => ({ date: r.date, value: r.value, outOfRange: isOutOfRange(r.value, range) })),
        }
      })
    },
  },
  {
    name: 'plot_series',
    description: 'Get the plotted time series for one analyte, with its reference band, so the agent can describe the trend.',
    parameters: [{ name: 'analyte', type: 'string', description: 'Canonical analyte name', required: true }],
    tier: 'attention',
    plugin: 'labs',
    handler: async ({ analyte }) => {
      const results = await listResults()
      const approved = await listApprovedRanges()
      const rows = results.filter((r) => r.analyte === String(analyte)).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      if (rows.length === 0) return { analyte, points: [] }
      const range = effectiveRange(rows[0], approved)
      return {
        analyte,
        unit: rows[0].unit,
        referenceLow: range.low,
        referenceHigh: range.high,
        referenceSource: range.source,
        points: rows.map((r) => ({ date: r.date, value: r.value, outOfRange: isOutOfRange(r.value, range) })),
      }
    },
  },
  {
    name: 'plot_panel',
    description: 'Get the plotted time series for every analyte in a named panel (e.g. "Lipid Panel").',
    parameters: [{ name: 'panel', type: 'string', description: 'Panel name as printed on the report', required: true }],
    tier: 'attention',
    plugin: 'labs',
    handler: async ({ panel }) => {
      const results = await listResults()
      const approved = await listApprovedRanges()
      const rows = results.filter((r) => r.panel === String(panel))
      const byAnalyte = new Map<string, LabResult[]>()
      for (const r of rows) {
        if (!byAnalyte.has(r.analyte)) byAnalyte.set(r.analyte, [])
        byAnalyte.get(r.analyte)!.push(r)
      }
      return Array.from(byAnalyte.entries()).map(([analyte, series]) => {
        const range = effectiveRange(series[0], approved)
        return {
          analyte,
          unit: series[0].unit,
          referenceLow: range.low,
          referenceHigh: range.high,
          points: series
            .slice()
            .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
            .map((r) => ({ date: r.date, value: r.value, outOfRange: isOutOfRange(r.value, range) })),
        }
      })
    },
  },
  {
    name: 'plot_heatmap',
    description: 'Get a matrix of every analyte over every collection date, each cell normalised to its position in the reference band (0 = low bound, 1 = high bound) so drift is visible at a glance.',
    parameters: [],
    tier: 'attention',
    plugin: 'labs',
    handler: async () => {
      const results = await listResults()
      const approved = await listApprovedRanges()
      const dates = Array.from(new Set(results.map((r) => r.date).filter((d): d is string => !!d))).sort()
      const analytes = Array.from(new Set(results.map((r) => r.analyte)))
      const cells = analytes.map((analyte) => {
        const rows = results.filter((r) => r.analyte === analyte)
        const range = effectiveRange(rows[0], approved)
        return {
          analyte,
          values: dates.map((date) => {
            const r = rows.find((x) => x.date === date)
            if (!r) return null
            if (range.low === undefined || range.high === undefined || range.high === range.low) return { value: r.value, normalized: null }
            return { value: r.value, normalized: (r.value - range.low) / (range.high - range.low) }
          }),
        }
      })
      return { dates, analytes: cells }
    },
  },
  {
    name: 'find_out_of_range',
    description: 'List accepted results currently outside their effective reference band, most recent first — a starting point for a diet plan goal.',
    parameters: [],
    tier: 'read',
    plugin: 'labs',
    handler: async () => {
      const results = await listResults()
      const approved = await listApprovedRanges()
      const latestByAnalyte = new Map<string, LabResult>()
      for (const r of results.slice().sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))) {
        latestByAnalyte.set(r.analyte, r)
      }
      return Array.from(latestByAnalyte.values())
        .map((r) => ({ result: r, range: effectiveRange(r, approved) }))
        .filter(({ result, range }) => isOutOfRange(result.value, range))
        .map(({ result, range }) => ({
          analyte: result.analyte,
          value: result.value,
          unit: result.unit,
          date: result.date,
          referenceLow: range.low,
          referenceHigh: range.high,
          referenceSource: range.source,
        }))
    },
  },
  {
    name: 'get_goal',
    description: 'Get the current dietary goal.',
    parameters: [],
    tier: 'memory',
    plugin: 'labs',
    handler: async () => {
      const plan = await loadDietMemory()
      return plan?.goal ?? null
    },
  },
  {
    name: 'get_plan',
    description: 'Get the current approved diet plan.',
    parameters: [],
    tier: 'memory',
    plugin: 'labs',
    handler: async () => {
      const plan = await loadDietMemory()
      return plan ?? null
    },
  },
  {
    name: 'propose_diet_plan',
    description: 'Draft a diet plan targeting an out-of-range analyte, with per-item adjustments. Staged until approved.',
    parameters: [
      { name: 'goal', type: 'object', description: 'Goal object with analyte, label, target, current, unit', required: true },
      { name: 'adjustments', type: 'array', description: 'Array of {item, action, targetAnalyte, rationale} objects', required: true },
    ],
    tier: 'staged',
    plugin: 'labs',
    handler: ({ goal, adjustments }) => {
      const plan: DietPlan = {
        goal: goal as DietGoal,
        adjustments: adjustments as DietAdjustment[],
      }
      const id = stageProposal({ id: `diet-plan-${Date.now()}`, type: 'plan', payload: plan })
      return { proposed: true, id, adjustmentsCount: plan.adjustments.length }
    },
  },
  {
    name: 'review_diet_plan',
    description: 'Final review of the approved diet plan against the latest accepted results: flags each targeted analyte as resolved (back in range), unresolved (still out of range), or no-data (nothing new since the plan), and separately flags any out-of-range result the plan doesn\'t cover. Renders on the page — call this whenever asked to do a final review, and summarise the flags in chat.',
    parameters: [],
    tier: 'attention',
    plugin: 'labs',
    handler: async () => reviewDietPlan(),
  },
]

export async function acceptResultProposals(ids: string[]) {
  const byId = new Map(getProposals('result').map((p) => [p.id, p]))
  const newResults: LabResult[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (!p) continue
    const proposal = p.payload as LabResultProposal
    newResults.push({ id, ...proposal })
  }
  if (newResults.length === 0) return
  const existing = await listResults()
  await replaceResults([...existing, ...newResults])
  for (const r of newResults) updateProposal(r.id, { status: 'accepted' })
}

export function rejectResultProposals(ids: string[], note?: string) {
  for (const id of ids) updateProposal(id, { status: 'rejected', note })
}

export async function acceptRangeProposal(id: string) {
  const p = getProposals('range').find((x) => x.id === id)
  if (!p) return
  const proposal = p.payload as ReferenceRangeProposal
  await approveRange({ ...proposal, id, approvedAt: Date.now() })
  updateProposal(id, { status: 'accepted' })
}

export function rejectRangeProposal(id: string, note?: string) {
  updateProposal(id, { status: 'rejected', note })
}

export function standardRangeSuggestion(analyte: string) {
  return standardRangeFor(analyte)
}
