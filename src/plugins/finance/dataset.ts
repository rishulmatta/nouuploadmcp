import { retainCommitsForDocuments } from '../../core/storage/commits'
import { removeProposals } from '../../core/staging/store'
import type { TransactionProposal } from './schema'
import { invalidateCategoryChart } from './chartState'

/**
 * Reconcile derived finance state with the documents that are currently loaded.
 * Category mappings intentionally survive: they are user preferences, not rows
 * derived from a particular statement.
 */
export async function reconcileFinanceDocuments(activeDocumentIds: Iterable<string>) {
  const active = new Set(activeDocumentIds)
  await retainCommitsForDocuments(active)
  removeProposals((proposal) => {
    if (proposal.type !== 'transaction') return false
    return !active.has((proposal.payload as TransactionProposal).doc)
  })
  invalidateCategoryChart()
}
