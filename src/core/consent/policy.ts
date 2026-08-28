import type { RedactionRule } from '../redact/patterns'

export type DisclosureLevel = 'allow' | 'aggregate' | 'deny'

export interface DisclosurePolicy {
  documentSetId: string
  rules: Record<string, DisclosureLevel>
}

const policies = new Map<string, DisclosurePolicy>()

export function setPolicy(policy: DisclosurePolicy) {
  policies.set(policy.documentSetId, policy)
}

export function getPolicy(documentSetId: string): DisclosurePolicy | undefined {
  return policies.get(documentSetId)
}

export function defaultPolicy(documentSetId: string, redactionRules: RedactionRule[]): DisclosurePolicy {
  const rules: Record<string, DisclosureLevel> = {}
  for (const r of redactionRules) {
    rules[r.id] = r.default
  }
  return { documentSetId, rules }
}

export function getLevel(policy: DisclosurePolicy, ruleId: string): DisclosureLevel {
  return policy.rules[ruleId] ?? 'allow'
}
