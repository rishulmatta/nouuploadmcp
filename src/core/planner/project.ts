import type { Goal, Adjustment } from '../storage/memory'

export function monthlyContribution(adjustments: Adjustment[]): number {
  return adjustments.reduce((sum, a) => sum + (a.currentMonthly - a.targetMonthly), 0)
}

/** Weekly equivalent of a monthly amount (12 months / ~52.18 weeks per year). */
export function weeklyFromMonthly(monthly: number): number {
  return (monthly * 12) / 52.1786
}

/** Most that could be freed up if every adjustment were cut to zero. */
export function maxMonthlyContribution(adjustments: Adjustment[]): number {
  return adjustments.reduce((sum, a) => sum + a.currentMonthly, 0)
}

/**
 * Re-target every adjustment so their combined monthly contribution equals
 * `newTotal`, preserving relative proportions between categories. Lets a
 * single "total monthly" slider drive the whole plan instead of only
 * per-category sliders.
 */
export function scaleAdjustmentsToTotal(adjustments: Adjustment[], newTotal: number): Adjustment[] {
  const maxTotal = maxMonthlyContribution(adjustments)
  const clamped = Math.max(0, Math.min(newTotal, maxTotal))
  const currentTotal = monthlyContribution(adjustments)
  const round2 = (n: number) => Math.round(n * 100) / 100

  if (currentTotal > 0) {
    const scale = clamped / currentTotal
    return adjustments.map((a) => {
      const cut = a.currentMonthly - a.targetMonthly
      const newCut = Math.max(0, Math.min(a.currentMonthly, cut * scale))
      return { ...a, targetMonthly: round2(a.currentMonthly - newCut) }
    })
  }
  // No existing cuts to scale from — distribute proportionally by category size.
  if (maxTotal <= 0) return adjustments
  return adjustments.map((a) => {
    const share = a.currentMonthly / maxTotal
    const newCut = clamped * share
    return { ...a, targetMonthly: round2(Math.max(0, a.currentMonthly - newCut)) }
  })
}

export function monthsToGoal(goal: Goal, adjustments: Adjustment[]): number {
  const monthly = monthlyContribution(adjustments)
  const rate = (goal.rate ?? 0) / 100 / 12

  if (goal.kind === 'debt') {
    const balance = goal.current - goal.target
    if (balance <= 0) return 0
    if (monthly <= 0) return Infinity
    if (rate > 0) {
      const interestCost = balance * rate
      if (monthly <= interestCost) return Infinity // payment doesn't even cover interest accrual
      return Math.ceil(-Math.log(1 - interestCost / monthly) / Math.log(1 + rate))
    }
    return Math.ceil(balance / monthly)
  }

  // savings goal
  if (monthly <= 0) return Infinity
  const gap = goal.target - goal.current
  if (gap <= 0) return 0
  if (rate > 0) {
    return Math.ceil(Math.log(1 + (gap * rate) / monthly) / Math.log(1 + rate))
  }
  return Math.ceil(gap / monthly)
}

export function projectionSeries(goal: Goal, adjustments: Adjustment[], months = 48): number[] {
  const monthly = monthlyContribution(adjustments)
  const rate = (goal.rate ?? 0) / 100 / 12
  const series: number[] = [goal.current]
  let value = goal.current
  for (let i = 0; i < months; i++) {
    value = goal.kind === 'debt'
      ? Math.max(0, value * (1 + rate) - monthly)
      : value * (1 + rate) + monthly
    series.push(value)
  }
  return series
}
