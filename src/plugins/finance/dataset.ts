import { replaceCommits, retainCommitsForDocuments } from '../../core/storage/commits'
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
  // Treat an empty document set as an explicit dataset reset. Besides being
  // clearer than filtering, replaceCommits always notifies live charts so a
  // just-removed final statement cannot leave monthly spend on screen.
  if (active.size === 0) await replaceCommits([])
  else await retainCommitsForDocuments(active)
  removeProposals((proposal) => {
    if (proposal.type !== 'transaction') return false
    return !active.has((proposal.payload as TransactionProposal).doc)
  })
  invalidateCategoryChart()
}
