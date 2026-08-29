import { getStorage } from './index'
import type { CategoryMapping } from '../../plugins/finance/schema'

const MAPPINGS_PATH = 'mappings.jsonl'
const listeners = new Set<() => void>()

export function subscribeApprovedMappings(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyMappingsChanged() {
  listeners.forEach((listener) => listener())
}

async function replaceApprovedMappings(mappings: CategoryMapping[]) {
  const storage = await getStorage()
  await storage.writeFile(MAPPINGS_PATH, mappings.map((mapping) => JSON.stringify(mapping)).join('\n') + (mappings.length ? '\n' : ''))
  notifyMappingsChanged()
}

export async function approveMapping(mapping: CategoryMapping): Promise<void> {
  const existing = await listApprovedMappings()
  await replaceApprovedMappings([
    ...existing.filter((item) => item.id !== mapping.id),
    { ...mapping, enabled: true },
  ])
}

export async function listApprovedMappings(): Promise<CategoryMapping[]> {
  const storage = await getStorage()
  const lines = await storage.readLines(MAPPINGS_PATH)
  return lines.map((l) => JSON.parse(l) as CategoryMapping)
}

export async function setApprovedMappingEnabled(id: string, enabled: boolean): Promise<void> {
  const existing = await listApprovedMappings()
  await replaceApprovedMappings(existing.map((mapping) => mapping.id === id ? { ...mapping, enabled } : mapping))
}
