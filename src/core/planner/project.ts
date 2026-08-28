import type { Goal, Adjustment } from '../storage/memory'

export function monthsToGoal(goal: Goal, adjustments: Adjustment[]): number {
  const monthlySavings = adjustments.reduce((sum, a) => sum + (a.currentMonthly - a.targetMonthly), 0)
  if (monthlySavings <= 0) return Infinity
  const gap = goal.target - goal.current
  if (gap <= 0) return 0
  const rate = (goal.rate ?? 0) / 100 / 12
  if (rate > 0) {
    return Math.ceil(Math.log(1 + (gap * rate) / monthlySavings) / Math.log(1 + rate))
  }
  return Math.ceil(gap / monthlySavings)
}

export function projectionSeries(goal: Goal, adjustments: Adjustment[], months = 48): number[] {
  const monthlySavings = adjustments.reduce((sum, a) => sum + (a.currentMonthly - a.targetMonthly), 0)
  const rate = (goal.rate ?? 0) / 100 / 12
  const series: number[] = [goal.current]
  let value = goal.current
  for (let i = 0; i < months; i++) {
    value = value * (1 + rate) + monthlySavings
    series.push(value)
  }
  return series
}
