import type { TransactionProposal } from '../../plugins/finance/schema'

export type ProposalType = 'transaction' | 'mapping' | 'range' | 'plan' | 'result'

export interface StagedProposal {
  id: string
  type: ProposalType
  payload: unknown
  note?: string
  status: 'pending' | 'accepted' | 'rejected'
}

const proposals: StagedProposal[] = []
const listeners = new Set<() => void>()

let version = 0
const snapshotCache = new Map<ProposalType | 'all', { version: number; data: StagedProposal[] }>()

function notify() {
  version++
  listeners.forEach((fn) => fn())
}

export function stageProposal(proposal: Omit<StagedProposal, 'status'>) {
  const existingIndex = proposals.findIndex((p) => p.id === proposal.id)
  if (existingIndex !== -1) {
    const existing = proposals[existingIndex]
    // Already decided (accepted/rejected) — don't resurrect it as a new pending
    // duplicate just because propose_* was called again on an unchanged source.
    if (existing.status !== 'pending') return existing.id
    // Still pending — refresh in place instead of pushing a second row with the
    // same id (which would render as a visible duplicate in the review list).
    proposals[existingIndex] = { ...proposal, status: 'pending' }
    notify()
    return existing.id
  }
  const p: StagedProposal = { ...proposal, status: 'pending' }
  proposals.push(p)
  notify()
  return p.id
}

export function getProposals(type?: ProposalType): StagedProposal[] {
  const key = type ?? 'all'
  const cached = snapshotCache.get(key)
  if (cached && cached.version === version) return cached.data
  const data = type ? proposals.filter((p) => p.type === type) : proposals.slice()
  snapshotCache.set(key, { version, data })
  return data
}

export function updateProposal(id: string, patch: Partial<StagedProposal>) {
  const p = proposals.find((x) => x.id === id)
  if (p) {
    Object.assign(p, patch)
    notify()
  }
}

export function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function clearProposals() {
  proposals.length = 0
  notify()
}
