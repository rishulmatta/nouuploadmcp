import { getStorage } from './index'

export type AuditDecision = 'allow' | 'deny' | 'granted-jit'

export interface AuditEntry {
  ts: number
  tool: string
  scope: string
  decision: AuditDecision
  grantSource?: 'once' | 'session' | 'always'
  charsReturned?: number
  digest?: string
  reason?: string
}

const AUDIT_PATH = 'audit.jsonl'

export async function appendAudit(entry: AuditEntry): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(AUDIT_PATH, JSON.stringify(entry))
}

export async function listAudit(): Promise<AuditEntry[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(AUDIT_PATH)
  return lines.map((l) => JSON.parse(l) as AuditEntry)
}

export function auditStats(entries: AuditEntry[]) {
  return {
    calls: entries.length,
    allowed: entries.filter((e) => e.decision === 'allow' || e.decision === 'granted-jit').length,
    denied: entries.filter((e) => e.decision === 'deny').length,
  }
}
