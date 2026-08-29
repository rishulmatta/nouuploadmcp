import { getStorage } from './index'
import type { Transaction } from '../../plugins/finance/schema'

const COMMITS_PATH = 'commits.jsonl'
const listeners = new Set<() => void>()

export function subscribeCommits(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyCommitsChanged() {
  listeners.forEach((listener) => listener())
}

export async function appendCommit(record: Transaction): Promise<void> {
  const storage = await getStorage()
  await storage.appendLine(COMMITS_PATH, JSON.stringify(record))
  notifyCommitsChanged()
}

export async function listCommits(): Promise<Transaction[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(COMMITS_PATH)
  return lines.map((l) => JSON.parse(l) as Transaction)
}

export async function replaceCommits(records: Transaction[]): Promise<void> {
  const storage = await getStorage()
  await storage.writeFile(COMMITS_PATH, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
  notifyCommitsChanged()
}

export async function removeCommitsForDocuments(docIds: Iterable<string>): Promise<void> {
  const ids = new Set(docIds)
  if (ids.size === 0) return
  const existing = await listCommits()
  await replaceCommits(existing.filter((record) => !ids.has(record.doc)))
}

export async function retainCommitsForDocuments(docIds: Iterable<string>): Promise<void> {
  const ids = new Set(docIds)
  const existing = await listCommits()
  const kept = existing.filter((record) => ids.has(record.doc))
  if (kept.length !== existing.length) await replaceCommits(kept)
}
