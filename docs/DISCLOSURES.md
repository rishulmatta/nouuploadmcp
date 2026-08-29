# Legal, disclosures, and conditions

Two things: short inline disclaimers where the risk actually lives, and one `/disclosures` page that says everything properly. Stated limitations read as judgment; discovered ones read as carelessness.

## Inline disclaimers — non-negotiable placements

| Where | Copy |
|---|---|
| Under any projection chart or slider surface | *Projections are arithmetic on your own data. Not financial advice.* |
| Under any lab chart or range badge | *Not medical advice. Reference ranges are shown with their source; discuss any changes with your doctor.* |
| On a standard-range badge | *Standard reference range — not from your report.* Tooltip: source + population (age/sex) |
| Diet plan header | *General dietary suggestions for a goal you selected. Not a treatment plan.* |
| Empty state, both plugins | *Text-layer PDFs only. Scanned images aren't supported.* |

## `/disclosures` page — full copy

> # Disclosures
>
> ## What this app does with your files
> Your PDFs are read and stored **inside this browser tab**, using your browser's local storage. They are never transmitted to us or to anyone else. There is no backend, no account, and no server that could receive them. You can verify this: open your browser's network panel and use the app.
>
> ## What the agent receives
> When an agent asks for data, this page checks your disclosure settings and either returns the data, refuses, or asks you. Text you authorize is passed to the agent you have connected — and from that point it is handled under **that agent provider's** terms and privacy policy, not ours. We have no visibility into or control over it.
>
> This is the one place your data can leave: the agent you chose to connect. The audit log records every such disclosure so you can see exactly what was shared and when.
>
> ## What we collect
> Nothing. No accounts, no analytics, no telemetry, no error reporting, no cookies beyond what's needed to keep the page working. Any of those would contradict the point of the app.
>
> ## Not financial advice
> This app performs arithmetic on figures extracted from your own statements. Projections show what happens if you save a given amount each month at a rate you set yourself. They are not forecasts, not recommendations, and not personalised financial advice. No feature of this app recommends financial products, investments, or allocations. Speak to a qualified adviser before making financial decisions.
>
> ## Not medical advice
> This app organises and charts results extracted from your own lab reports. Where a report prints a reference range, that range is used and labelled as coming from your report. Where it does not, a standard range may be shown — always labelled as standard, with its source and the population it applies to. Reference ranges vary by laboratory, method, age, sex, and other factors. Nothing here is a diagnosis, an interpretation, or a treatment recommendation. Discuss your results with a qualified clinician.
>
> ## Accuracy and your responsibility
> Data is extracted from your PDFs by an AI agent and is **not guaranteed to be correct**. That is why nothing is saved until you approve it against the source page, and why every stored value links back to the page it came from. Extraction errors are possible and expected — please review proposals carefully. Do not rely on this app for tax, legal, medical, or accounting purposes without independent verification.
>
> ## Software warranty
> Released under the MIT License. Provided "as is", without warranty of any kind. See LICENSE in the repository.
>
> ## Third-party components
> PDF rendering uses Mozilla's pdf.js (Apache 2.0). Reference range sources are cited individually where shown. No other third-party service is contacted at runtime.
>
> ## Scope
> Text-layer PDFs only; scanned documents are not supported. Single user, single device — no accounts, sync, or sharing. See the README for full scope.
>
> ## Contact
> Issues and questions: the GitHub repository.

## Terms of use — short form

Link from the footer as *Terms*; can live on the same `/disclosures` page under a heading.

> By using this app you accept that it is provided free, as-is, without warranty; that you are responsible for verifying any data it extracts; that it provides no financial, medical, legal, tax, or accounting advice; and that data you authorize for disclosure is thereafter governed by your agent provider's terms. Don't use it as a system of record.

## A consequence worth honouring

**Do not add analytics.** Not Vercel Analytics, not Plausible, not a single beacon. Any outbound request contradicts the claim a judge is going to verify in their network panel — and it's the claim the entire entry rests on. This is also why the demo shot of an empty network panel works: it has to actually be empty.
