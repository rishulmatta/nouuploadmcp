import { useState } from 'react'
import { registry } from '../../core/mcp'
import StepCard from '../../ui/StepCard'
import type { DocumentMeta } from '../../core/storage/documents'
import ReviewPanel from './ReviewPanel'
import TrendsPanel from './TrendsPanel'
import DietPlanPanel from './DietPlanPanel'
import AdherencePanel from './AdherencePanel'

export default function LabsFlow({ documents }: { documents: DocumentMeta[] }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)

  if (documents.length === 0) {
    return (
      <StepCard n={2} title="Trends" subtitle="Waiting on step 1 — upload 2–3 lab reports above">
        <p className="muted">Nothing to plot yet.</p>
      </StepCard>
    )
  }

  const extract = async () => {
    setLoading(true)
    try {
      const result = await registry.invoke('propose_results', { doc: 'all' })
      setMessage(`Proposed ${(result as { proposed: number }).proposed} results.`)
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
        title="Trends"
        subtitle="Extract and pick your results below — trends plot automatically once accepted"
        prompts={['Extract the results from my lab reports', 'What trends do you see across my results?']}
      >
        <div className="row">
          <button onClick={extract} disabled={loading}>Extract results</button>
          <button onClick={() => setReviewing(!reviewing)}>{reviewing ? 'Hide review' : 'Review proposals'}</button>
        </div>
        {message && <p className="pill">{message}</p>}
        {reviewing && <ReviewPanel />}
        <TrendsPanel />
      </StepCard>

      <StepCard n={3} title="Deficiencies & diet" subtitle="Ask for a plan and the agent will place it in the review table below" prompts={["Create a diet plan from my out-of-range results and put it in the table below"]}>
        <DietPlanPanel />
      </StepCard>

      <StepCard
        n={4}
        title="Amend"
        subtitle="Ask the agent to revise, or edit the plan directly above"
        prompts={['Add an item to the plan for my low Vitamin D', 'Drop the fish oil item, I\'m allergic']}
      >
        <p className="muted">The plan above is fully editable — add, remove, or change items yourself, or ask the agent to call <code>propose_diet_plan</code> again with a revision.</p>
      </StepCard>

      <StepCard n={5} title="Final review" prompts={["Do a final review and flag anything not going to plan"]}>
        <AdherencePanel />
      </StepCard>
    </>
  )
}
