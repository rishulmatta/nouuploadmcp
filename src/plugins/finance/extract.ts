import type { ParsedPage } from '../../core/ingest/pdf'
import type { TransactionProposal } from './schema'

const DATE_RE = /(\d{4}-\d{2}-\d{2})/
const MONEY_RE = /£?([\d,]+\.\d{2})/

export function extractTransactionsFromPage(docId: string, page: ParsedPage): TransactionProposal[] {
  const proposals: TransactionProposal[] = []
  const spansByLine = new Map<number, typeof page.spans>()
  for (const span of page.spans) {
    const line = span.line
    if (!spansByLine.has(line)) spansByLine.set(line, [])
    spansByLine.get(line)!.push(span)
  }

  const sortedLines = Array.from(spansByLine.keys()).sort((a, b) => a - b)

  for (const line of sortedLines) {
    const spans = spansByLine.get(line)!
    const text = spans.map((s) => s.text).join(' ')
    if (text.includes('Balance brought forward')) continue
    if (text.includes('Opening balance')) continue
    if (text.includes('Closing balance')) continue

    const dateMatch = DATE_RE.exec(text)
    const moneyMatches = Array.from(text.matchAll(MONEY_RE))
    if (!dateMatch || moneyMatches.length === 0) continue

    const date = dateMatch[1]
    const amounts = moneyMatches.map((m) => parseFloat(m[1].replace(',', '')))
    const lastAmount = amounts[amounts.length - 1]
    const balance = amounts.length >= 2 ? amounts[amounts.length - 1] : undefined
    const amount = amounts.length >= 2 ? amounts[amounts.length - 2] : lastAmount

    // Determine sign from context: income vs spend
    // Heuristic: if description contains known income words, positive
    const desc = text
      .replace(DATE_RE, '')
      .replace(new RegExp(MONEY_RE.source, 'g'), '')
      .replace(/£/g, '')
      .trim()
    const isIncome = /salary|freelance|deposit|refund/i.test(desc)
    const signedAmount = isIncome ? Math.abs(amount) : -Math.abs(amount)

    const firstSpan = spans[0]
    proposals.push({
      doc: docId,
      page: page.page,
      anchor: page.spans.indexOf(firstSpan),
      date,
      description: desc,
      amount: signedAmount,
      balance,
    })
  }

  return proposals
}
