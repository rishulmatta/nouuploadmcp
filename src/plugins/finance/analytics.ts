import { categorizeTransaction } from './mappings'
import type { Transaction } from './schema'

export function monthKey(date: string) {
  return date.slice(0, 7)
}

/** The currency symbol as printed on the statement(s), or "$" if none was captured. */
export function currencySymbol(txs: Transaction[]): string {
  return txs.find((t) => t.currency)?.currency ?? '$'
}

export function groupByMonth(txs: Transaction[]): Map<string, number> {
  const months = new Map<string, number>()
  for (const tx of txs) {
    const m = monthKey(tx.date)
    months.set(m, (months.get(m) ?? 0) + tx.amount)
  }
  return months
}

export function groupSpendByCategory(txs: Transaction[]): Map<string, number> {
  const cats = new Map<string, number>()
  for (const tx of txs) {
    if (tx.amount >= 0) continue
    const { category } = categorizeTransaction(tx)
    cats.set(category, (cats.get(category) ?? 0) + Math.abs(tx.amount))
  }
  return cats
}

export function monthsCovered(txs: Transaction[]): number {
  return new Set(txs.map((t) => monthKey(t.date))).size || 1
}

/** Spend per category divided by the number of distinct statement months —
 *  a true monthly average, not a total across everything loaded. Using the
 *  raw total as "currentMonthly" silently inflates a plan (e.g. a 12-month
 *  total read as one month's spend) into something the account can't support. */
export function avgMonthlySpendByCategory(txs: Transaction[]): Map<string, number> {
  const months = monthsCovered(txs)
  const totals = groupSpendByCategory(txs)
  const avg = new Map<string, number>()
  for (const [category, total] of totals) avg.set(category, total / months)
  return avg
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function spendSummary(txs: Transaction[]) {
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const months = monthsCovered(txs)
  const net = income - expense
  const topCategories = Array.from(groupSpendByCategory(txs).entries())
    .map(([category, total]) => ({ category, total: round2(total), avgMonthly: round2(total / months) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return {
    transactionCount: txs.length,
    months,
    totalIncome: round2(income),
    totalExpense: round2(expense),
    net: round2(net),
    avgMonthlyIncome: round2(income / months),
    avgMonthlyExpense: round2(expense / months),
    avgMonthlySurplus: round2(income / months - expense / months),
    savingsRate: income > 0 ? Math.round((net / income) * 1000) / 10 : 0,
    topCategories,
  }
}
