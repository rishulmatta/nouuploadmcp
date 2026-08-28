import type { ToolSpec } from '../../core/mcp/types'
import { listDocuments, loadParsedPage } from '../../core/storage/documents'
import { stageProposal, getProposals, updateProposal } from '../../core/staging/store'
import { listCommits, replaceCommits } from '../../core/storage/commits'
import { extractTransactionsFromPage } from './extract'
import type { Transaction, TransactionProposal, CategoryMapping } from './schema'
import { txKey } from './schema'
import { loadMemory, getLivePlan, type Goal, type Adjustment, type Plan } from '../../core/storage/memory'
import { groupByMonth, groupSpendByCategory, avgMonthlySpendByCategory, spendSummary } from './analytics'
import { monthlyContribution, weeklyFromMonthly } from '../../core/planner/project'

/** The live in-page state (updated synchronously on every slider drag) wins
 *  over the debounced-to-disk copy, so an agent asking "is this still
 *  feasible" right after the human drags a slider gets the current numbers. */
async function currentPlan(): Promise<Plan | null> {
  const live = getLivePlan()
  if (live !== undefined) return live
  return (await loadMemory()) ?? null
}
import { approveMapping } from '../../core/storage/mappings'
import { loadApprovedMappings } from './mappings'
import { renderSpendByCategory } from './chartState'

function stagePlanProposal(idPrefix: string, goal: Goal, adjustments: Adjustment[]) {
  const plan: Plan = { goal, adjustments }
  stageProposal({ id: `${idPrefix}-${Date.now()}`, type: 'plan', payload: plan })
  return plan
}

export const financeTools: ToolSpec[] = [
  {
    name: 'propose_transactions',
    description: 'Scan loaded statements and propose transaction rows for human review.',
    parameters: [
      { name: 'doc', type: 'string', description: 'Document id, or "all" for all loaded documents', required: true },
    ],
    tier: 'staged',
    plugin: 'finance',
    handler: async ({ doc }) => {
      const owned = await listDocuments('finance')
      const docs = doc === 'all' ? owned : owned.filter((d) => d.id === String(doc))
      const proposals: TransactionProposal[] = []
      for (const d of docs) {
        for (let p = 1; p <= d.pageCount; p++) {
          const page = await loadParsedPage(d.id, p)
          if (!page) continue
          proposals.push(...extractTransactionsFromPage(d.id, page))
        }
      }
      // Deduplicate by key
      const seen = new Set<string>()
      const unique = proposals.filter((p) => {
        const key = txKey(p)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      for (const p of unique) {
        stageProposal({ id: txKey(p), type: 'transaction', payload: p })
      }
      return { proposed: unique.length, sample: unique.slice(0, 3) }
    },
  },
  {
    name: 'get_review_status',
    description: 'Get the current state of staged proposals, including accept/reject notes.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: () => {
      const pending = getProposals('transaction').filter((p) => p.status === 'pending')
      const accepted = getProposals('transaction').filter((p) => p.status === 'accepted')
      const rejected = getProposals('transaction').filter((p) => p.status === 'rejected')
      const plans = getProposals('plan')
      const latestPlan = plans[plans.length - 1]
      return {
        pending: pending.length,
        accepted: accepted.length,
        rejected: rejected.length,
        rejectedWithNotes: rejected.map((p) => ({ id: p.id, note: p.note })),
        plan: latestPlan
          ? { id: latestPlan.id, status: latestPlan.status, note: latestPlan.note, payload: latestPlan.payload }
          : null,
      }
    },
  },
  {
    name: 'reconcile_statement',
    description: 'Check that debits + credits match the closing balance on a statement.',
    parameters: [
      { name: 'doc', type: 'string', description: 'Document id', required: true },
      { name: 'openingBalance', type: 'number', description: 'Opening balance', required: true },
      { name: 'closingBalance', type: 'number', description: 'Closing balance', required: true },
    ],
    tier: 'read',
    plugin: 'finance',
    handler: async ({ doc, openingBalance, closingBalance }) => {
      const commits = await listCommits()
      const txs = commits.filter((c) => c.doc === String(doc))
      const net = txs.reduce((sum, t) => sum + t.amount, 0)
      const expected = Number(openingBalance) + net
      const diff = expected - Number(closingBalance)
      return {
        doc,
        transactions: txs.length,
        net,
        expectedClosing: expected,
        printedClosing: Number(closingBalance),
        reconciled: Math.abs(diff) < 0.01,
        diff,
      }
    },
  },
  {
    name: 'list_categories',
    description: 'List default spending categories.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: () => [
      'Dining out', 'Groceries', 'Subscriptions', 'Transport', 'Health', 'Bills', 'Income', 'Other',
    ],
  },
  {
    name: 'propose_mapping',
    description: 'Propose a merchant/category classification rule based on the actual transaction descriptions in this statement set — a rule, not individual rows. One approved rule classifies every transaction that matches it, now and on future statements. Staged until a human approves; applied at read time only, never rewrites a stored transaction.',
    parameters: [
      { name: 'pattern', type: 'string', description: 'Lowercase substring to match against transaction descriptions, e.g. "amzn mktp"', required: true },
      { name: 'merchant', type: 'string', description: 'Human-readable merchant name, e.g. "Amazon"', required: true },
      { name: 'category', type: 'string', description: 'Category, e.g. Dining out, Groceries, Subscriptions, Transport, Health, Bills, Income, Other', required: true },
    ],
    tier: 'staged',
    plugin: 'finance',
    handler: async ({ pattern, merchant, category }) => {
      const lowerPattern = String(pattern).toLowerCase()
      const dupe = getProposals('mapping').find((p) => p.status === 'pending' && (p.payload as CategoryMapping).pattern === lowerPattern)
      if (dupe) return { proposed: false, reason: 'already proposed', id: dupe.id }
      const commits = await listCommits()
      const matchCount = commits.filter((t) => t.description.toLowerCase().includes(lowerPattern)).length
      const mapping: CategoryMapping = {
        id: `map-${lowerPattern.replace(/\s+/g, '-')}-${Date.now()}`,
        pattern: lowerPattern,
        merchant: String(merchant),
        category: String(category),
        matchCount,
      }
      const id = stageProposal({ id: mapping.id, type: 'mapping', payload: mapping })
      return { proposed: true, id, matchCount }
    },
  },
  {
    name: 'get_goal',
    description: 'Get the current goal (null if none is set yet — savings goal or debt/loan goal, whichever the human is currently working on). Reflects the page right now, including unsaved slider drags.',
    parameters: [],
    tier: 'memory',
    plugin: 'finance',
    handler: async () => {
      const plan = await currentPlan()
      return plan?.goal ?? null
    },
  },
  {
    name: 'get_plan',
    description: 'Get the current plan — goal, per-category adjustments, and the human\'s notes — reflecting exactly what\'s on screen right now, including slider drags the human hasn\'t explicitly saved. Always call this before judging a plan (e.g. "is this feasible?") rather than assuming it still matches what you last proposed. Null if no goal is set yet.',
    parameters: [],
    tier: 'memory',
    plugin: 'finance',
    handler: async () => {
      return await currentPlan()
    },
  },
  {
    name: 'get_plan_feasibility',
    description: 'Check whether the current plan\'s required savings/payment is actually achievable given the account\'s real average monthly surplus (income minus expense) from the loaded statements. Use this whenever asked "is this plan feasible?" instead of eyeballing the numbers.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: async () => {
      await loadApprovedMappings()
      const plan = await currentPlan()
      if (!plan) return { feasible: null, reason: 'No goal is set yet.' }
      const summary = spendSummary(await listCommits())
      const requiredMonthly = monthlyContribution(plan.adjustments)
      const shortfall = Math.max(0, Math.round((requiredMonthly - summary.avgMonthlySurplus) * 100) / 100)
      return {
        requiredMonthly,
        requiredWeekly: Math.round(weeklyFromMonthly(requiredMonthly) * 100) / 100,
        avgMonthlySurplus: summary.avgMonthlySurplus,
        monthsOfDataUsed: summary.months,
        feasible: requiredMonthly <= summary.avgMonthlySurplus,
        shortfall,
      }
    },
  },
  {
    name: 'propose_savings_plan',
    description: 'Draft a savings plan toward a goal (e.g. a car, an emergency fund) with per-category spending adjustments. Staged until approved; renders as sliders on the page.',
    parameters: [
      { name: 'goal', type: 'object', description: 'Goal object: { label, target, current, rate? } — rate is an assumed annual return, as a plain percentage number where 5 means 5% (not 0.05). Omit or 0 if you\'re not assuming any investment growth.', required: true },
      { name: 'adjustments', type: 'array', description: 'Array of { category, currentMonthly, targetMonthly, rationale }. currentMonthly must be a true monthly average — use get_spend_by_category\'s avgMonthly field, never its total (which is summed across every month of statements loaded, not one month) — or the plan will propose an unaffordable amount.', required: true },
    ],
    tier: 'staged',
    plugin: 'finance',
    handler: async ({ goal, adjustments }) => {
      const g: Goal = { kind: 'savings', ...(goal as object) } as Goal
      const adj = adjustments as Adjustment[]
      stagePlanProposal('plan', g, adj)
      return { proposed: true, adjustmentsCount: adj.length }
    },
  },
  {
    name: 'propose_repayment_plan',
    description: 'Draft a debt repayment plan: outstanding balance, interest rate, and monthly payment freed up from spending adjustments. Staged until approved; renders as sliders on the page.',
    parameters: [
      { name: 'goal', type: 'object', description: 'Goal object: { label, current, target?, rate } — current is the outstanding balance, target is the payoff target (default 0), rate is the annual interest rate (APR) as a plain percentage number where 20 means 20% (not 0.20)', required: true },
      { name: 'adjustments', type: 'array', description: 'Array of { category, currentMonthly, targetMonthly, rationale } — freed cash applied as extra payment toward the balance. currentMonthly must be a true monthly average (get_spend_by_category\'s avgMonthly field, not its total) or the payment plan won\'t be affordable.', required: true },
    ],
    tier: 'staged',
    plugin: 'finance',
    handler: async ({ goal, adjustments }) => {
      const g: Goal = { kind: 'debt', target: 0, ...(goal as object) } as Goal
      const adj = adjustments as Adjustment[]
      stagePlanProposal('repayment', g, adj)
      return { proposed: true, adjustmentsCount: adj.length }
    },
  },
  {
    name: 'get_spend_summary',
    description: 'Aggregate summary of committed transactions: income, expense, savings rate, top spending categories. Use for open-ended questions about spending patterns.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: async () => {
      await loadApprovedMappings()
      return spendSummary(await listCommits())
    },
  },
  {
    name: 'get_spend_by_category',
    description: 'Spend per category across committed transactions, sorted highest first — both the total across all loaded statements and the monthly average. Use `avgMonthly`, not `total`, as a category\'s "currentMonthly" when drafting a plan — `total` is summed across every month of statements loaded, not one month.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: async () => {
      await loadApprovedMappings()
      const commits = await listCommits()
      const avg = avgMonthlySpendByCategory(commits)
      return Array.from(groupSpendByCategory(commits).entries())
        .map(([category, total]) => ({
          category,
          total: Math.round(total * 100) / 100,
          avgMonthly: Math.round((avg.get(category) ?? 0) * 100) / 100,
        }))
        .sort((a, b) => b.total - a.total)
    },
  },
  {
    name: 'plot_spend_by_category',
    description: 'Render the "Spend by category" chart on the page from committed transactions and currently approved mappings. Unlike the cashflow chart, this one never updates on its own — call this whenever mappings change or you want the human to see current categorisation. Call get_spend_by_category first if you need the numbers yourself; this tool is for changing what\'s on screen, not for reading data.',
    parameters: [],
    tier: 'attention',
    plugin: 'finance',
    handler: async () => {
      const snapshot = await renderSpendByCategory()
      return { rendered: true, categories: snapshot.data.length, renderedAt: snapshot.renderedAt }
    },
  },
  {
    name: 'get_monthly_cashflow',
    description: 'Net cashflow (income minus expense) per month across committed transactions.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: async () => {
      const commits = await listCommits()
      return Array.from(groupByMonth(commits).entries())
        .map(([month, net]) => ({ month, net: Math.round(net * 100) / 100 }))
        .sort((a, b) => a.month.localeCompare(b.month))
    },
  },
  {
    name: 'find_recurring',
    description: 'Find repeating charges across committed transactions.',
    parameters: [],
    tier: 'read',
    plugin: 'finance',
    handler: async () => {
      const commits = await listCommits()
      const byDesc = new Map<string, { count: number; total: number; amount: number }>()
      for (const tx of commits) {
        if (tx.amount >= 0) continue
        const key = tx.description.toLowerCase()
        const cur = byDesc.get(key) ?? { count: 0, total: 0, amount: Math.abs(tx.amount) }
        cur.count++
        cur.total += Math.abs(tx.amount)
        byDesc.set(key, cur)
      }
      return Array.from(byDesc.entries())
        .filter(([, v]) => v.count >= 2)
        .map(([name, v]) => ({ name, count: v.count, average: Math.round((v.total / v.count) * 100) / 100 }))
    },
  },
]

export async function acceptTransactionProposals(ids: string[]) {
  const byId = new Map(getProposals('transaction').map((p) => [p.id, p]))
  const newTxs: Transaction[] = []
  for (const id of ids) {
    const p = byId.get(id)
    if (!p) continue
    const proposal = p.payload as TransactionProposal
    newTxs.push({
      id,
      doc: proposal.doc,
      page: proposal.page,
      anchor: proposal.anchor,
      date: proposal.date,
      description: proposal.description,
      amount: proposal.amount,
      balance: proposal.balance,
      currency: proposal.currency,
    })
  }
  if (newTxs.length === 0) return
  const existing = await listCommits()
  await replaceCommits([...existing, ...newTxs])
  for (const tx of newTxs) updateProposal(tx.id, { status: 'accepted' })
}

export function rejectTransactionProposals(ids: string[], note?: string) {
  for (const id of ids) updateProposal(id, { status: 'rejected', note })
}

export async function acceptMappingProposal(id: string) {
  const p = getProposals('mapping').find((x) => x.id === id)
  if (!p) return
  const mapping = p.payload as CategoryMapping
  await approveMapping(mapping)
  await loadApprovedMappings()
  updateProposal(id, { status: 'accepted' })
}

export function rejectMappingProposal(id: string, note?: string) {
  updateProposal(id, { status: 'rejected', note })
}
