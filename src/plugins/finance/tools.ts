import type { ToolSpec } from '../../core/mcp/types'
import { listDocuments, loadParsedPage } from '../../core/storage/documents'
import { stageProposal, getProposals, updateProposal } from '../../core/staging/store'
import { listCommits, appendCommit } from '../../core/storage/commits'
import { extractTransactionsFromPage } from './extract'
import type { Transaction, TransactionProposal, SavingsPlan } from './schema'
import { txKey } from './schema'
import { loadMemory, saveMemory } from '../../core/storage/memory'
import { categorizeTransaction } from './mappings'

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
      const docs = doc === 'all' ? await listDocuments() : [{ id: String(doc), name: '', size: 0, pageCount: 0, createdAt: 0 }]
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
      return {
        pending: pending.length,
        accepted: accepted.length,
        rejected: rejected.length,
        rejectedWithNotes: rejected.map((p) => ({ id: p.id, note: p.note })),
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
    name: 'get_goal',
    description: 'Get the current savings goal.',
    parameters: [],
    tier: 'memory',
    plugin: 'finance',
    handler: async () => {
      const plan = await loadMemory()
      return plan?.goal ?? null
    },
  },
  {
    name: 'get_plan',
    description: 'Get the current approved savings plan.',
    parameters: [],
    tier: 'memory',
    plugin: 'finance',
    handler: async () => {
      const plan = await loadMemory()
      return plan ?? null
    },
  },
  {
    name: 'propose_savings_plan',
    description: 'Draft a savings plan with per-category adjustments. Staged until approved.',
    parameters: [
      { name: 'goal', type: 'object', description: 'Goal object with label, target, current', required: true },
      { name: 'adjustments', type: 'array', description: 'Array of adjustment objects', required: true },
    ],
    tier: 'staged',
    plugin: 'finance',
    handler: async ({ goal, adjustments }) => {
      const plan: SavingsPlan = {
        goal: goal as { label: string; target: number; current: number },
        adjustments: (adjustments as { category: string; currentMonthly: number; targetMonthly: number; rationale: string }[]),
      }
      stageProposal({ id: `plan-${Date.now()}`, type: 'plan', payload: plan })
      return { proposed: true, adjustmentsCount: plan.adjustments.length }
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

export async function acceptTransactionProposal(id: string, patch?: Partial<Transaction>) {
  const p = getProposals('transaction').find((x) => x.id === id)
  if (!p) return
  const proposal = p.payload as TransactionProposal
  const tx: Transaction = {
    id,
    doc: proposal.doc,
    page: proposal.page,
    anchor: proposal.anchor,
    date: proposal.date,
    description: proposal.description,
    amount: proposal.amount,
    balance: proposal.balance,
    ...patch,
  }
  await appendCommit(tx)
  updateProposal(id, { status: 'accepted' })
}

export function rejectTransactionProposal(id: string, note?: string) {
  updateProposal(id, { status: 'rejected', note })
}
