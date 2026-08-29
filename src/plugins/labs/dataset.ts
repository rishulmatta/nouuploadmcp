import { removeProposals } from '../../core/staging/store'
import { getStorage } from '../../core/storage'
import { clearDietMemory } from './memory'

const DERIVED_LABS_FILES = ['lab-results.jsonl', 'ranges.jsonl']

/**
 * Lab results, ranges, and plans describe one exact set of source reports.
 * Changing that set invalidates the whole derived workspace so information from
 * a previous set can never be mistaken for information from the current one.
 */
export async function resetLabsDataset(): Promise<void> {
  const storage = await getStorage()
  await Promise.all([
    ...DERIVED_LABS_FILES.map((path) => storage.deleteFile(path).catch(() => {})),
    clearDietMemory(),
  ])
  removeProposals((proposal) => (
    proposal.type === 'result' || proposal.type === 'range' || proposal.type === 'plan'
  ))
}
