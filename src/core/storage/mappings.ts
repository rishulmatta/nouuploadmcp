import { getStorage } from './index'
import type { CategoryMapping } from '../../plugins/finance/schema'

const MAPPINGS_PATH = 'mappings.jsonl'

export async function approveMapping(mapping: CategoryMapping): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(MAPPINGS_PATH, JSON.stringify(mapping))
}

export async function listApprovedMappings(): Promise<CategoryMapping[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(MAPPINGS_PATH)
  return lines.map((l) => JSON.parse(l) as CategoryMapping)
}
