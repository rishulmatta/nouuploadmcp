import type { TransactionProposal } from '../../plugins/finance/schema'

export type ProposalType = 'transaction' | 'mapping' | 'range' | 'plan'

export interface StagedProposal {
  id: string
  type: ProposalType
  payload: unknown
  note?: string
  status: 'pending' | 'accepted' | 'rejected'
}

const proposals: StagedProposal[] = []
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function stageProposal(proposal: Omit<StagedProposal, 'status'>) {
  const p: StagedProposal = { ...proposal, status: 'pending' }
  proposals.push(p)
  notify()
  return p.id
}

export function getProposals(type?: ProposalType): StagedProposal[] {
  return type ? proposals.filter((p) => p.type === type) : proposals.slice()
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
