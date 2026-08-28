import type { Grant } from './grants'
import type { DisclosurePolicy } from './policy'
import type { AuditEntry } from '../storage/audit'

export type ConsentOutcome =
  | { status: 'allowed'; reason: string }
  | { status: 'denied'; reason: string; available?: string[] }
  | { status: 'pending'; request: ConsentRequest }

export interface ConsentRequest {
  scope: string
  reason: string
  documentSetId?: string
  preview?: string
}

const pending = new Map<string, { resolve: (level: Grant['level'] | null) => void; reject: (err: Error) => void }>()
let idCounter = 0

export function requestConsent(req: ConsentRequest): Promise<Grant['level'] | null> {
  const id = `consent-${++idCounter}`
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    // 60s timeout built with the promise
    const timeout = setTimeout(() => {
      pending.delete(id)
      resolve(null)
    }, 60000)
    // Replace resolve so it clears the timeout
    const originalResolve = resolve
    resolve = (value) => {
      clearTimeout(timeout)
      pending.delete(id)
      originalResolve(value)
    }
    pending.set(id, { resolve, reject })
  })
}

export function resolveConsent(id: string, level: Grant['level'] | null) {
  const p = pending.get(id)
  if (p) {
    p.resolve(level)
    pending.delete(id)
  }
}

export function evaluateConsent(
  scope: string,
  reason: string,
  policy: DisclosurePolicy,
  grants: Grant[],
  ruleIds: string[],
): ConsentOutcome {
  const deniedRules = ruleIds.filter((id) => policy.rules[id] === 'deny')
  if (deniedRules.length === 0) {
    return { status: 'allowed', reason: 'policy allows' }
  }

  const matching = grants.find((g) => g.scope === scope || scope.startsWith(g.scope))
  if (matching) {
    return { status: 'allowed', reason: `grant: ${matching.level}` }
  }

  return {
    status: 'denied',
    reason: `DENIED: field${deniedRules.length > 1 ? 's' : ''} ${deniedRules.map((r) => `"${r}"`).join(', ')} set to deny. Call request_disclosure({scope, reason}) if you need it.`,
    available: Object.entries(policy.rules)
      .filter(([, level]) => level !== 'deny')
      .map(([id]) => id),
  }
}

export function consentToAuditEntry(
  tool: string,
  scope: string,
  outcome: ConsentOutcome,
): AuditEntry {
  return {
    ts: Date.now(),
    tool,
    scope,
    decision: outcome.status === 'allowed' ? 'allow' : outcome.status === 'denied' ? 'deny' : 'granted-jit',
    reason: outcome.reason,
  }
}
