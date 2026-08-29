import { useState } from 'react'
import { registry } from '../../core/mcp'
import StepCard from '../../ui/StepCard'
import type { DocumentMeta } from '../../core/storage/documents'
import ReviewPanel from './ReviewPanel'
import MappingReviewPanel from './MappingReviewPanel'
import { MonthlyCashflowChart, CategorySpendChart } from './ChartsPanel'
import GoalPanel from './GoalPanel'

export default function FinanceFlow({ documents }: { documents: DocumentMeta[] }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)

  if (documents.length === 0) {
    return (
      <StepCard n={2} title="Pick your transactions" subtitle="Waiting on step 1 — upload a statement above">
        <p className="muted">Nothing to extract yet.</p>
      </StepCard>
    )
  }

  const extract = async () => {
    setLoading(true)
    try {
      const result = await registry.invoke('propose_transactions', { doc: 'all' })
      setMessage(`Proposed ${(result as { proposed: number }).proposed} transactions.`)
      setReviewing(true)
    } catch (e) {
      setMessage(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <StepCard
        n={2}
        title="Pick your transactions"
        subtitle="Extract locally, then accept or reject what was found — transaction details are not returned to the agent until accepted"
        prompts={['Extract the transactions from my statements', 'What transactions are pending review?']}
      >
        <div className="row">
          <button onClick={extract} disabled={loading}>Extract transactions</button>
          <button onClick={() => setReviewing(!reviewing)}>{reviewing ? 'Hide review' : 'Review proposals'}</button>
        </div>
        {message && <p className="pill">{message}</p>}
        {reviewing && <ReviewPanel />}
      </StepCard>

      <MappingReviewPanel />

      <StepCard n={3} title="Monthly spend" subtitle="Spend, income and net cashflow — updates automatically as you accept transactions" prompts={['Summarise my monthly cashflow']}>
        <MonthlyCashflowChart />
      </StepCard>

      <StepCard
        n={4}
        title="Categorize spending"
        subtitle="Nothing here updates on its own — ask the agent"
        prompts={['Categorise my spending and show me a pie chart', 'Regenerate category mappings from my accepted transactions', "What's still showing as Other?", 'Render the spend by category chart']}
      >
        <CategorySpendChart />
      </StepCard>

      <StepCard
        n="5–7"
        title="Savings plan, sliders & feasibility"
        subtitle="Ask for a plan, tune it below, then check if it's realistic"
      >
        <GoalPanel />
      </StepCard>
    </>
  )
}
