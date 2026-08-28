import type { ReactNode } from 'react'

export default function StepCard({ n, title, subtitle, prompts, children }: {
  n: string | number
  title: string
  subtitle?: string
  /** Example phrasings to say to the agent for this step — shown as copyable chips. */
  prompts?: string[]
  children: ReactNode
}) {
  return (
    <div className="card col step">
      <div className="row" style={{ alignItems: 'flex-start', gap: '0.75rem' }}>
        <span className="step-badge">{n}</span>
        <div className="col" style={{ gap: '0.15rem', flex: 1 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {subtitle && <span className="muted step-subtitle">{subtitle}</span>}
        </div>
      </div>
      {prompts && prompts.length > 0 && (
        <div className="prompt-list col">
          {prompts.map((p) => (
            <PromptChip key={p} text={p} />
          ))}
        </div>
      )}
      <div className="col step-body">{children}</div>
    </div>
  )
}

function PromptChip({ text }: { text: string }) {
  return (
    <div className="prompt-chip row" style={{ justifyContent: 'space-between' }}>
      <span>"{text}"</span>
      <button className="ghost" onClick={() => navigator.clipboard.writeText(text)} title="Copy prompt">Copy</button>
    </div>
  )
}
