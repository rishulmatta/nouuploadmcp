import type { ParsedPage, TextSpan } from '../../core/ingest/pdf'
import type { LabResultProposal } from './schema'
import { canonicalizeAnalyte } from './mappings'

const RESULT_VALUE_RE = /^-?\d+(\.\d+)?$/
const RANGE_RE = /^(?:(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)|<\s*(-?\d+(?:\.\d+)?)|>\s*(-?\d+(?:\.\d+)?))$/
const PANEL_HEADER_RE = /^[A-Z][A-Z0-9 /&-]{3,}$/
const ISO_DATE_RE = /(\d{4}-\d{2}-\d{2})/
const DMY_DATE_RE = /(\d{1,2})\/(\d{1,2})\/(\d{4})/
const COLUMN_HEADER_RE = /^(analyte|test|result|units?|reference range|flag)$/i
// OCR noise tokens that are never analyte names or result values: dates
// (24/11/20), times (8:20 AM), and long IDs (lab numbers, Medicare numbers).
const NOISE_TOKEN_RE = /^(\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})|\d{1,2}:\d{2}|(AM|PM)|\d{6,})$/i

function extractDate(text: string): string | undefined {
  const iso = ISO_DATE_RE.exec(text)
  if (iso) return iso[1]
  // Scanned Australian/UK reports print DD/MM/YYYY — normalise to ISO.
  const dmy = DMY_DATE_RE.exec(text)
  if (dmy) {
    const [, d, m, y] = dmy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return undefined
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

function parseRange(text: string | undefined): { low?: number; high?: number } {
  if (!text) return {}
  // OCR'd reports often wrap ranges in parentheses: "(4.0-6.0)"
  const m = RANGE_RE.exec(text.trim().replace(/^\((.*)\)$/, '$1'))
  if (!m) return {}
  if (m[1] !== undefined) return { low: Number(m[1]), high: Number(m[2]) }
  if (m[3] !== undefined) return { high: Number(m[3]) }
  if (m[4] !== undefined) return { low: Number(m[4]) }
  return {}
}

export function extractResultsFromPage(docId: string, page: ParsedPage): LabResultProposal[] {
  const lines = groupIntoLines(page.spans)
  const proposals: LabResultProposal[] = []
  let panel: string | undefined
  let collectionDate: string | undefined

  for (const line of lines) {
    const texts = line.map((s) => s.text.trim()).filter(Boolean)
    if (texts.length === 0) continue
    const joined = texts.join(' ')

    // Prefer the date after "Collected" — report headers print several dates
    // (requested/collected/reported) on one line.
    if (/collected/i.test(joined)) {
      const afterCollected = joined.slice(joined.search(/collected/i))
      collectionDate = extractDate(afterCollected) ?? extractDate(joined)
      if (collectionDate) continue
    }

    if (texts.length === 1 && PANEL_HEADER_RE.test(texts[0]) && !COLUMN_HEADER_RE.test(texts[0])) {
      panel = texts[0]
      continue
    }

    if (COLUMN_HEADER_RE.test(texts[0])) continue

    // Row shape: [analyte name (one or more words), value, unit, range, flag?]
    const tokens = texts.filter((t) => !NOISE_TOKEN_RE.test(t))
    const valueIdx = tokens.findIndex((t) => RESULT_VALUE_RE.test(t))
    if (valueIdx < 1) continue

    const rawAnalyte = tokens.slice(0, valueIdx).join(' ')
    const value = parseFloat(tokens[valueIdx])
    const unit = tokens[valueIdx + 1] ?? ''
    const { low: referenceLow, high: referenceHigh } = parseRange(tokens[valueIdx + 2])

    const { canonical, unit: canonicalUnit } = canonicalizeAnalyte(rawAnalyte)

    proposals.push({
      doc: docId,
      page: page.page,
      anchor: page.spans.indexOf(line[0]),
      panel,
      analyte: canonical,
      rawAnalyte,
      value,
      unit: unit || canonicalUnit || '',
      referenceLow,
      referenceHigh,
      referenceSource: referenceLow !== undefined || referenceHigh !== undefined ? 'report' : undefined,
      date: collectionDate,
    })
  }

  return proposals
}
