import { getStorage } from '../../core/storage'
import type { DietPlan } from './schema'

const MEMORY_PATH = 'labs-memory.json'

export async function loadDietMemory(): Promise<DietPlan | undefined> {
  try {
    const storage = await getStorage()
    const text = await storage.readText(MEMORY_PATH)
    return JSON.parse(text) as DietPlan
  } catch {
    return undefined
  }
}

export async function saveDietMemory(plan: DietPlan): Promise<void> {
  const storage = await getStorage()
  await storage.writeFile(MEMORY_PATH, JSON.stringify(plan))
}
