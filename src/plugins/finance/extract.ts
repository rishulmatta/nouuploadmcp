import type { ParsedPage, TextSpan } from '../../core/ingest/pdf'
import type { TransactionProposal } from './schema'

// Statement layouts vary a lot: date formats (ISO, "28 APR", "28/04/2025"),
// single-line vs. multi-line rows, and either one signed "Amount" column or
// separate "Withdrawals"/"Deposits" columns. This module normalises all of
// that into { date, description, amount, balance } proposals for review.

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASH_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const MONTH_DATE_RE = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s*(\d{4})?$/
const YEAR_ONLY_RE = /^(\d{4})$/
const MONEY_TOKEN_RE = /^\(?[+-]?([$£€])?\s?([\d,]+\.\d{2})\)?\s?(DR|CR)?$/i
const BLANK_TOKEN_RE = /^(blank|n\/a|--|-)$/i

const DEBIT_HEADER_RE = /withdrawal|debit|payments?\s*out|money\s*out|paid\s*out/i
const CREDIT_HEADER_RE = /deposit|credit|payments?\s*in|money\s*in|paid\s*in/i
const BALANCE_HEADER_RE = /balance/i

const NOISE_RE = /balance brought forward|opening balance|closing balance|totals? at end of page/i

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Parses a token that is *entirely* a date (not a date embedded in a longer string). */
function parseDateToken(text: string, yearContext: number | undefined): string | undefined {
  const t = text.trim()

  let m = ISO_DATE_RE.exec(t)
  if (m) return t

  m = MONTH_DATE_RE.exec(t)
  if (m) {
    const monIdx = MONTHS.indexOf(m[2].slice(0, 3).toUpperCase())
    const year = m[3] ? Number(m[3]) : yearContext
    if (monIdx >= 0 && year) return `${year}-${pad(monIdx + 1)}-${pad(Number(m[1]))}`
  }

  m = SLASH_DATE_RE.exec(t)
  if (m) {
    const p1 = Number(m[1])
    const p2 = Number(m[2])
    const year = Number(m[3])
    // Ambiguous D/M vs M/D; if the second part can't be a month, it must be the day.
    const [day, month] = p2 > 12 ? [p2, p1] : [p1, p2]
    if (month >= 1 && month <= 12) return `${year}-${pad(month)}-${pad(day)}`
  }

  return undefined
}

function parseMoneyToken(text: string): { value: number; explicitSign?: 1 | -1; currency?: string } | undefined {
  const t = text.trim()
  const m = MONEY_TOKEN_RE.exec(t)
  if (!m) return undefined
  const value = parseFloat(m[2].replace(/,/g, ''))
  if (Number.isNaN(value)) return undefined
  let explicitSign: 1 | -1 | undefined
  if (t.startsWith('(') || t.includes(')') || t.startsWith('-') || /DR$/i.test(t)) explicitSign = -1
  else if (t.startsWith('+') || /CR$/i.test(t)) explicitSign = 1
  return { value, explicitSign, currency: m[1] }
}

interface ColumnHint {
  rightEdge: number
  sign: 1 | -1
}

/** Looks for "Withdrawals"/"Deposits" (or Debit/Credit, Money In/Out, ...) column
 *  headers and records the x-position their values are right-aligned to, so we can
 *  read the sign straight off the table layout instead of guessing from keywords. */
function detectColumnHints(spans: TextSpan[]): ColumnHint[] {
  const hints: ColumnHint[] = []
  for (const span of spans) {
    const text = span.text.trim()
    if (!text || BALANCE_HEADER_RE.test(text)) continue
    const rightEdge = span.x + span.width
    if (DEBIT_HEADER_RE.test(text)) hints.push({ rightEdge, sign: -1 })
    else if (CREDIT_HEADER_RE.test(text)) hints.push({ rightEdge, sign: 1 })
  }
  return hints
}

function signFromColumn(hints: ColumnHint[], right: number): 1 | -1 | undefined {
  const TOLERANCE = 6
  let best: ColumnHint | undefined
  let bestDist = Infinity
  for (const h of hints) {
    const d = Math.abs(h.rightEdge - right)
    if (d < bestDist) {
      bestDist = d
      best = h
    }
  }
  return best && bestDist <= TOLERANCE ? best.sign : undefined
}

interface Block {
  date: string
  spans: TextSpan[]
  firstSpan: TextSpan
}

function groupIntoLines(spans: TextSpan[]): TextSpan[][] {
  const byLine = new Map<number, TextSpan[]>()
  for (const s of spans) {
    if (!byLine.has(s.line)) byLine.set(s.line, [])
    byLine.get(s.line)!.push(s)
  }
  return Array.from(byLine.keys())
    .sort((a, b) => a - b)
    .map((line) => byLine.get(line)!)
}

const EMBEDDED_DATE_RE = /\b(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\b/

/** Falls back to a year mentioned anywhere on the page (e.g. "EFFECTIVE DATE 19 APR
 *  2025") for statements that only print the year once, on an earlier page, next to
 *  a bare "28 APR" style date. */
function derivePageYearHint(page: ParsedPage): number | undefined {
  for (const span of page.spans) {
    const m = EMBEDDED_DATE_RE.exec(span.text)
    if (m && MONTHS.includes(m[2].slice(0, 3).toUpperCase())) return Number(m[3])
  }
  return undefined
}

function buildBlocks(page: ParsedPage): Block[] {
  const lines = groupIntoLines(page.spans)
  const blocks: Block[] = []
  let current: Block | undefined
  let yearContext: number | undefined = derivePageYearHint(page)

  for (const line of lines) {
    const first = line[0]
    const firstText = first?.text.trim() ?? ''

    const yearOnly = YEAR_ONLY_RE.exec(firstText)
    if (yearOnly && line.length === 1) {
      yearContext = Number(yearOnly[1])
      continue
    }

    // Page footers ("TOTALS AT END OF PAGE ...") don't start a transaction, but
    // they also aren't part of the previous row's description — close the block
    // instead of letting the footer's numbers contaminate the last transaction.
    const lineText = line.map((s) => s.text.trim()).filter(Boolean).join(' ')
    if (NOISE_RE.test(lineText)) {
      current = undefined
      continue
    }

    const date = first ? parseDateToken(firstText, yearContext) : undefined
    if (date) {
      current = { date, spans: [...line], firstSpan: first }
      blocks.push(current)
      continue
    }

    if (current) current.spans.push(...line)
  }

  return blocks
}

export function extractTransactionsFromPage(docId: string, page: ParsedPage): TransactionProposal[] {
  const columnHints = detectColumnHints(page.spans)
  const blocks = buildBlocks(page)
  const proposals: TransactionProposal[] = []

  for (const block of blocks) {
    const descParts: string[] = []
    const money: { value: number; explicitSign?: 1 | -1; currency?: string; right: number }[] = []

    for (const span of block.spans) {
      const text = span.text.trim()
      if (!text || span === block.firstSpan) continue
      if (BLANK_TOKEN_RE.test(text)) continue

      const parsed = parseMoneyToken(text)
      if (parsed) {
        money.push({ ...parsed, right: span.x + span.width })
      } else {
        descParts.push(text)
      }
    }

    const description = descParts.join(' ').replace(/\s+/g, ' ').trim()
    if (NOISE_RE.test(description) || money.length === 0) continue

    // Last money value is the running balance when a second value (the
    // transaction amount) is present; otherwise the lone value is the amount.
    const balanceEntry = money.length >= 2 ? money[money.length - 1] : undefined
    const amountEntry = money.length >= 2 ? money[money.length - 2] : money[0]

    const columnSign = signFromColumn(columnHints, amountEntry.right)
    const sign = columnSign ?? amountEntry.explicitSign ?? (/salary|freelance|deposit|refund|interest received/i.test(description) ? 1 : -1)

    proposals.push({
      doc: docId,
      page: page.page,
      anchor: page.spans.indexOf(block.firstSpan),
      date: block.date,
      description,
      amount: sign * Math.abs(amountEntry.value),
      balance: balanceEntry?.value,
      currency: amountEntry.currency ?? balanceEntry?.currency,
    })
  }

  return proposals
}
