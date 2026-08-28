import { getStorage } from './index'

export type GoalKind = 'savings' | 'debt'

export interface Goal {
  kind?: GoalKind // defaults to 'savings'
  label: string
  target: number // savings: amount to reach. debt: payoff target, usually 0
  current: number // savings: current balance. debt: current outstanding balance
  rate?: number // annual %: savings = assumed return, debt = interest rate (APR)
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

export async function clearMemory(): Promise<void> {
  try {
    const storage = await getStorage()
    await storage.deleteFile(MEMORY_PATH)
  } catch {
    // nothing to clear
  }
}

// Disk writes are debounced for durability, which would let a tool call land
// in the gap between a slider drag and the write actually landing. The page
// mirrors every change here synchronously so get_goal/get_plan always answer
// with what's on screen right now, not a stale pre-drag value.
// `undefined` = this tab hasn't hydrated a goal yet (fall back to disk).
let livePlan: Plan | null | undefined
const livePlanListeners = new Set<() => void>()

export function setLivePlan(plan: Plan | null): void {
  livePlan = plan
  livePlanListeners.forEach((fn) => fn())
}

export function getLivePlan(): Plan | null | undefined {
  return livePlan
}

export function subscribeLivePlan(fn: () => void): () => void {
  livePlanListeners.add(fn)
  return () => livePlanListeners.delete(fn)
}
