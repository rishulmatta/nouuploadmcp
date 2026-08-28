import { getStorage } from './index'

export interface Goal {
  label: string
  target: number
  current: number
  rate?: number // monthly assumed return %
}

export interface Plan {
  goal: Goal
  adjustments: Adjustment[]
  note?: string
}

export interface Adjustment {
  category: string
  currentMonthly: number
  targetMonthly: number
  rationale: string
}

const MEMORY_PATH = 'memory.json'

export async function loadMemory(): Promise<Plan | undefined> {
  try {
    const storage = await getStorage()
    const text = await storage.readText(MEMORY_PATH)
    return JSON.parse(text) as Plan
  } catch {
    return undefined
  }
}

export async function saveMemory(plan: Plan): Promise<void> {
  const storage = await getStorage()
  await storage.writeFile(MEMORY_PATH, JSON.stringify(plan))
}
