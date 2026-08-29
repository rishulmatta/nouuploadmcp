import { listCommits } from '../../core/storage/commits'
import { groupSpendByCategory } from './analytics'
import { loadApprovedMappings } from './mappings'

// Unlike the month-by-month cashflow chart (pure date arithmetic — always safe to
// render automatically), "spend by category" depends on categorisation, which is
// only as good as whatever mappings have been approved so far. Auto-rendering it
// on every commit change means it silently flickers between "everything is Other"
// and whatever partial categorisation happens to exist at that moment. Instead,
// this chart only updates when explicitly rendered — by the agent calling
// plot_spend_by_category, or by a human clicking "Render now" — so what's on
// screen always reflects a deliberate snapshot, not incidental state.

export interface CategorySnapshot {
  data: [string, number][]
  renderedAt: number
}

let snapshot: CategorySnapshot | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function subscribeCategoryChart(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getCategoryChartSnapshot(): CategorySnapshot | null {
  return snapshot
}

/** A rendered category chart is a snapshot of the active transaction set. */
export function invalidateCategoryChart() {
  if (snapshot === null) return
  snapshot = null
  notify()
}

export async function renderSpendByCategory(): Promise<CategorySnapshot> {
  await loadApprovedMappings()
  const commits = await listCommits()
  const data = Array.from(groupSpendByCategory(commits).entries()).sort((a, b) => b[1] - a[1])
  snapshot = { data, renderedAt: Date.now() }
  notify()
  return snapshot
}
