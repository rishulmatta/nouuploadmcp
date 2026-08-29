import { getStorage } from '../../core/storage'
import type { DietPlan } from './schema'

const MEMORY_PATH = 'labs-memory.json'

let cachedPlan: DietPlan | undefined
let cacheLoaded = false
let writeQueue: Promise<void> = Promise.resolve()

export async function loadDietMemory(): Promise<DietPlan | undefined> {
  if (cacheLoaded) return cachedPlan
  try {
    const storage = await getStorage()
    const text = await storage.readText(MEMORY_PATH)
    cachedPlan = JSON.parse(text) as DietPlan
  } catch {
    cachedPlan = undefined
  }
  cacheLoaded = true
  return cachedPlan
}

export async function saveDietMemory(plan: DietPlan): Promise<void> {
  // Update synchronously so a review requested immediately after an edit sees
  // the latest table state, while serialising disk writes to preserve ordering.
  cachedPlan = plan
  cacheLoaded = true
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    const storage = await getStorage()
    await storage.writeFile(MEMORY_PATH, JSON.stringify(plan))
  })
  await writeQueue
}

export async function clearDietMemory(): Promise<void> {
  cachedPlan = undefined
  cacheLoaded = true
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    const storage = await getStorage()
    await storage.deleteFile(MEMORY_PATH).catch(() => {})
  })
  await writeQueue
}
