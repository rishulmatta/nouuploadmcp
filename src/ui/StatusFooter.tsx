import { useEffect, useState } from 'react'
import { useAppState } from '../core/state'
import { getProposals, subscribe as subscribeStaging } from '../core/staging/store'
import { listGrants } from '../core/consent/grants'
import { listCommits } from '../core/storage/commits'
import { getLivePlan, subscribeLivePlan } from '../core/storage/memory'
import { currencySymbol, groupSpendByCategory } from '../plugins/finance/analytics'

/** Live "receipt" strip — proposals pending, grants held, and (on the finance
 *  workspace) categories in use and the current goal — so a human can see at
 *  a glance what state the agent left the page in, without asking it. */
export default function StatusFooter() {
  const { plugin } = useAppState()
  const [pending, setPending] = useState(0)
  const [grantsCount, setGrantsCount] = useState(0)
  const [categories, setCategories] = useState(0)
  const [goalText, setGoalText] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      const pendingCount = getProposals().filter((p) => p.status === 'pending').length
      const grants = await listGrants()
      if (cancelled) return
      setPending(pendingCount)
      setGrantsCount(grants.length)

      if (plugin !== 'finance') {
        setCategories(0)
        setGoalText(null)
        return
      }

      const commits = await listCommits()
      if (cancelled) return
      setCategories(groupSpendByCategory(commits).size)

      const plan = getLivePlan()
      setGoalText(plan ? `${plan.goal.label || (plan.goal.kind === 'debt' ? 'debt' : 'goal')} ${currencySymbol(commits)}${plan.goal.target}` : null)
    }

    refresh()
    const unsubStaging = subscribeStaging(refresh)
    const unsubPlan = subscribeLivePlan(refresh)
    const id = setInterval(refresh, 3000)
    return () => {
      cancelled = true
      unsubStaging()
      unsubPlan()
      clearInterval(id)
    }
  }, [plugin])

  const parts = [
    `${pending} proposal${pending === 1 ? '' : 's'} pending`,
    `${grantsCount} grant${grantsCount === 1 ? '' : 's'}`,
  ]
  if (plugin === 'finance') {
    parts.push(`${categories} categor${categories === 1 ? 'y' : 'ies'}`)
    parts.push(goalText ? `goal: ${goalText}` : 'no goal set')
  }

  return <span className="pill">{parts.join(' · ')}</span>
}
