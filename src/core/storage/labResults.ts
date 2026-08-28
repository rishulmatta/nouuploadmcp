import { getStorage } from './index'
import type { LabResult } from '../../plugins/labs/schema'

const RESULTS_PATH = 'lab-results.jsonl'

export async function appendResult(record: LabResult): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(RESULTS_PATH, JSON.stringify(record))
}

export async function listResults(): Promise<LabResult[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(RESULTS_PATH)
  return lines.map((l) => JSON.parse(l) as LabResult)
}

export async function replaceResults(records: LabResult[]): Promise<void> {
  const storage = await getStorage()
  await storage.writeFile(RESULTS_PATH, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
}
