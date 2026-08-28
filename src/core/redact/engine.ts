import type { RedactionRule } from './patterns'
import type { TextSpan } from '../ingest/pdf'

export interface RedactedSpan extends TextSpan {
  ruleId: string
  masked: string
}

export function scanRedactions(spans: TextSpan[], rules: RedactionRule[]): RedactedSpan[] {
  const redacted: RedactedSpan[] = []
  for (const span of spans) {
    for (const rule of rules) {
      const regex = new RegExp(rule.regex.source, rule.regex.flags.replace('g', '') + 'g')
      let match: RegExpExecArray | null
      while ((match = regex.exec(span.text)) !== null) {
        redacted.push({
          ...span,
          ruleId: rule.id,
          masked: '█'.repeat(match[0].length),
        })
      }
    }
  }
  return redacted
}

export function applyRedactions(spans: TextSpan[], redactions: RedactedSpan[]): TextSpan[] {
  // Simple span-level masking. For overlapping redactions, prefer the first.
  const byIndex = new Map<number, RedactedSpan>()
  for (const r of redactions) {
    const idx = spans.indexOf(r as unknown as TextSpan)
    if (idx >= 0 && !byIndex.has(idx)) {
      byIndex.set(idx, r)
    }
  }
  return spans.map((span, i) => {
    const r = byIndex.get(i)
    if (!r) return span
    return { ...span, text: r.masked }
  })
}

export function redactText(text: string, rules: RedactionRule[]): string {
  let out = text
  for (const rule of rules) {
    out = out.replace(rule.regex, (match) => '█'.repeat(match.length))
  }
  return out
}
