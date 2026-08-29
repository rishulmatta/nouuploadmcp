import { listApprovedMappings } from '../../core/storage/mappings'
import type { Transaction, CategoryMapping } from './schema'

export interface CategoryRule {
  id: string
  pattern: string
  category: string
  merchant: string
  enabled?: boolean
}

// Rules the agent proposed and a human approved (propose_mapping), consulted
// to the user's transaction descriptions. The generic rules below only seed
// proposals; they never apply until the human approves them. Applied mappings
// work at read time only and never rewrite a stored transaction.
let approvedRules: CategoryRule[] = []

export async function loadApprovedMappings(): Promise<CategoryRule[]> {
  const approved = await listApprovedMappings()
  approvedRules = approved.map((m: CategoryMapping) => ({ id: m.id, pattern: m.pattern, category: m.category, merchant: m.merchant, enabled: m.enabled !== false }))
  return approvedRules
}

export const defaultCategoryRules: CategoryRule[] = [
  { id: 'r1', pattern: 'starbrew', category: 'Dining out', merchant: 'Starbrew Coffee' },
  { id: 'r2', pattern: 'greenway', category: 'Groceries', merchant: 'Greenway Grocers' },
  { id: 'r3', pattern: 'streamflix', category: 'Subscriptions', merchant: 'StreamFlix' },
  { id: 'r4', pattern: 'metro', category: 'Transport', merchant: 'Metro Transport' },
  { id: 'r5', pattern: 'fitlab', category: 'Health', merchant: 'FitLab Gym' },
  { id: 'r6', pattern: 'cloudpower', category: 'Bills', merchant: 'CloudPower Energy' },
  { id: 'r7', pattern: 'urban', category: 'Dining out', merchant: 'Urban Eats' },
  { id: 'r8', pattern: 'quickshop', category: 'Groceries', merchant: 'QuickShop' },
  { id: 'r9', pattern: 'audiowave', category: 'Subscriptions', merchant: 'AudioWave' },
  { id: 'r10', pattern: 'petrol', category: 'Transport', merchant: 'Petrol Express' },
  { id: 'r11', pattern: 'salary', category: 'Income', merchant: 'Employer' },
  { id: 'r12', pattern: 'freelance', category: 'Income', merchant: 'Freelance' },
  { id: 'r13', pattern: 'newsplus', category: 'Subscriptions', merchant: 'NewsPlus Digital' },
  { id: 'r14', pattern: 'cloudsync', category: 'Subscriptions', merchant: 'CloudSync Pro' },
  { id: 'r15', pattern: 'toolkit', category: 'Subscriptions', merchant: 'Premium Toolkit' },
]

export function categorize(description: string, rules?: CategoryRule[]): { category: string; merchant: string } {
  const lower = description.toLowerCase()
  if (!rules) {
    const userRule = approvedRules.find((rule) => lower.includes(rule.pattern))
    if (userRule) {
      return userRule.enabled === false
        ? { category: 'Other', merchant: userRule.merchant }
        : { category: userRule.category, merchant: userRule.merchant }
    }
    // Defaults seed reviewable proposals; they never classify silently.
    return { category: 'Other', merchant: description }
  }
  for (const rule of rules) {
    if (lower.includes(rule.pattern)) {
      return { category: rule.category, merchant: rule.merchant }
    }
  }
  return { category: 'Other', merchant: description }
}

export function categorizeTransaction(tx: Transaction, rules?: CategoryRule[]) {
  return categorize(tx.description, rules)
}
