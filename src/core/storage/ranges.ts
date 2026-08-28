import { getStorage } from './index'
import type { ApprovedReferenceRange } from '../../plugins/labs/schema'

const RANGES_PATH = 'ranges.jsonl'

export async function approveRange(range: ApprovedReferenceRange): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(RANGES_PATH, JSON.stringify(range))
}

export async function listApprovedRanges(): Promise<ApprovedReferenceRange[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(RANGES_PATH)
  return lines.map((l) => JSON.parse(l) as ApprovedReferenceRange)
}
