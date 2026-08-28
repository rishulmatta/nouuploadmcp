import type { Transaction } from './schema'

export interface CategoryRule {
  id: string
  pattern: string
  category: string
  merchant: string
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

export function categorize(description: string, rules: CategoryRule[] = defaultCategoryRules): { category: string; merchant: string } {
  const lower = description.toLowerCase()
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
