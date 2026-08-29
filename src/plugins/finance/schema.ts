export interface Transaction {
  id: string
  doc: string
  page: number
  anchor: number // span index in page
  date: string // ISO date
  description: string
  amount: number // negative for debit, positive for credit
  balance?: number
  currency?: string // symbol as printed on the statement, e.g. "$", "£", "€"
}

export interface TransactionProposal {
  doc: string
  page: number
  anchor: number
  date: string
  description: string
  amount: number
  balance?: number
  currency?: string
}

export interface CategoryMapping {
  id: string
  pattern: string
  merchant: string
  category: string
  matchCount: number
  enabled?: boolean
}

export function txKey(tx: { doc: string; page: number; anchor: number }) {
  return `${tx.doc}:${tx.page}:${tx.anchor}`
}
