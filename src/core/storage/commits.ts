import { getStorage } from './index'
import type { Transaction } from '../../plugins/finance/schema'

const COMMITS_PATH = 'commits.jsonl'

export async function appendCommit(record: Transaction): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(COMMITS_PATH, JSON.stringify(record))
}

export async function listCommits(): Promise<Transaction[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(COMMITS_PATH)
  return lines.map((l) => JSON.parse(l) as Transaction)
}

export async function replaceCommits(records: Transaction[]): Promise<void> {
  const storage = await getStorage()
  await storage.writeFile(COMMITS_PATH, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
}
