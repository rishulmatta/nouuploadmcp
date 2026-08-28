# No Upload — Execution Plan (v3)

| | |
|---|---|
| **Product** | No Upload |
| **Domain** | **nouploadmcp.app** |
| **Live URL** | `https://nouploadmcp.app` (Cloudflare Pages) |
| **Hackathon** | The WebMCP Challenge (Devpost) |
| **Deadline** | Thu Sep 3 2026, 1:00pm PDT — *treat Tue Sep 2 EOD as the real deadline* |
| **Today** | Fri Aug 28 — 6 working days |
| **Primary plugin** | Financial statements |
| **Secondary plugin** | Blood test reports (gated on Gate 4) |

**v3 additions:** §17 SPA route map and home page design with ready copy · §18 legal, disclosures and the disclosure statement page · §19 fixtures and anonymisation.

**v2 changes:** finance is now the primary plugin (real data available), labs is secondary. Adds the shared five-stage pipeline, reference-range fallback with provenance, and the goal-planner stage with sliders as a continuous review surface.

### Why finance leads

You have twelve months of real statements — so you build against reality instead of guessing, and your domain intuition shows up in the product. The arc is also more legible to a judge than the lab one: twelve statements, no idea where the money went, a £40k car, 34 months, drag the sliders, 19 months. "34 → 19 as you drag" is a stronger closing beat than a trend line.

**Your real data is a build asset but a video liability.** Develop against it; ship anonymised fixtures. See §19.

---

## 1. Product definition (locked — do not drift)

**No Upload is a local consent gateway that lets agents work on your private documents without the documents ever leaving your device.**

- The page holds the documents. Nothing is uploaded. No backend.
- The agent (Codex, Claude, ChatGPT) drives the page through WebMCP tools.
- The human's job is **validate, filter, authorize** — deciding what may flow to the agent, and approving anything the agent wants to write back.
- Document types are **plugins**: financial transactions (primary), blood test reports (secondary).

Pitch line:

> Agents can't be trusted with your financial or medical documents today, because using them means uploading them. No Upload inverts that: the documents stay in your browser, and the page decides — with your explicit authorization, logged — exactly what the agent is allowed to see.

### Three authorities the page keeps

| The page owns | Meaning |
|---|---|
| **Disclosure** | Nothing reaches the agent without a policy match or a human grant |
| **Commits** | The agent proposes; only a human click writes |
| **Memory** | State persists in the page across sessions; the agent is stateless |

---

## 2. The five-stage pipeline (both plugins, same shape)

This symmetry *is* the architecture claim. Stages 2, 4 and 5 are shared core; the plugin supplies schema, bands, validation, views, and goal types.

| Stage | Finance | Labs |
|---|---|---|
| **1 Extract** | transactions from statement PDFs | results from report PDFs |
| **2 Canonicalise** | `AMZN MKTP US*2K4` → Amazon → Shopping | `Glycated Haemoglobin` → HbA1c, mmol/mol → % |
| **3 Analyse** | category spend, recurring charges, savings rate | trend vs reference band, drift |
| **4 Plan vs human goal** | £40k car → savings plan | low ferritin → dietary plan |
| **5 Persist** | goal + plan + exclusions survive the session | same |

`propose_mapping` (stage 2) and `propose_*_plan` (stage 4) are one abstraction each, serving both plugins. Say so in the write-up — it's evidence, not assertion.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CORE (plugin-agnostic)                                     │
│  ingest/    pdf.js render + text layer + positions          │
│  storage/   OPFS: bytes, commits, grants, audit, memory     │
│  redact/    pattern engine, span masking, preview           │
│  consent/   policy, JIT prompts, grants, audit log          │
│  staging/   proposal store (memory only) + review shell     │
│  charts/    SVG trend+band, stacked area, heatmap, panel    │
│  planner/   goal store, projection engine, slider surface   │
│  mcp/       tool registry, dispatch, consent middleware     │
│  memory/    durable KV the agent reads across chats         │
└─────────────────────────────────────────────────────────────┘
                            ▲
              ┌─────────────┴─────────────┐
        plugins/finance              plugins/labs
        (PRIMARY)                    (secondary — gated)
```

### Plugin interface

```ts
interface Plugin {
  id: "finance" | "labs";
  label: string; blurb: string;
  accepts: string[];

  redaction: RedactionRule[];
  recordSchema: JSONSchema;
  identity: (r: Record) => string;
  validate: (r: Record, ctx) => ValidationResult;
  crossValidate?: (rs: Record[], doc) => ValidationResult;  // finance: closing-balance reconciliation

  canonical: { label: string; supportsUnitConversion: boolean };

  // stage 3
  series: { x: string; y: string; band?: BandSpec; groupBy?: string };
  views: ("trend" | "stacked" | "heatmap" | "panel" | "table")[];
  bandSource?: BandSourceSpec;   // labs only — see §5

  // stage 4
  goalTypes: GoalType[];         // finance: savings target. labs: nutrient target
  planSchema: JSONSchema;
  project?: (goal, adjustments) => ProjectionSeries;  // finance: months-to-goal

  tools: ToolSpec[];
  exporters: { id: string; label: string; run(commits): Blob }[];
}
```

**Rule:** if you write plugin-specific code inside `core/`, stop and widen the interface instead.

---

## 4. The consent model (centerpiece)

### 4.1 Disclosure policy

Per document set, every field/span class is `allow` | `aggregate` | `deny`. Defaults from the plugin's redaction rules.

- Finance denies by default: account number, card number, holder name, address, sort code.
- Labs denies by default: patient name, DOB, MRN, address, ordering physician.

### 4.2 Just-in-time consent

Consent-gated tool calls pass through middleware with three outcomes.

**Allowed** — return data, write an audit entry.

**Denied** — return a *structured, instructive* refusal. A good denial teaches the agent what to ask for instead:

```
DENIED: field "account_number" is set to deny.
Available on this document: statement_period, closing_balance, transaction rows.
Call request_disclosure({scope}) if you genuinely need it and can state why.
```

**Pending** — raise a consent card; the tool promise waits:

```
┌────────────────────────────────────────────────┐
│  The agent is requesting:                      │
│  → full text of page 2 of "Statement — Mar"    │
│  Reason: "extract the transaction table"        │
│  3 spans will remain masked  [preview]          │
│  [Allow once] [Allow this session] [Deny]       │
└────────────────────────────────────────────────┘
```

Resolve on click. **60s timeout** returns `"still pending — call get_review_status when the user has decided"` so a distracted user never wedges the agent. Build the timeout *with* the promise, not after.

### 4.3 Grants

`{scope, level: "once"|"session"|"always", grantedAt, documentSetId}`. `always` persists; `session` is memory. Panel of active grants with per-grant revoke.

### 4.4 Audit log — do not skip

Append-only, persisted, first-class screen:

```ts
{ ts, tool, scope, decision: "allow"|"deny"|"granted-jit",
  grantSource, charsReturned, digest, reason? }
```

Header:

> **Nothing has been uploaded.** 47 tool calls · 12 disclosures authorized · 3 denied · 0 bytes sent to any server.

An array plus a table view. Cheapest high-impact feature in the build, and the artifact that converts the privacy claim into a receipt.

---

## 5. Reference ranges (labs) — fallback with visible provenance

If the report prints a range, use it. If not, fall back to a standard range — but **never silently**.

Every band carries a provenance badge:

- **From your report** — "Northwood Labs printed 13.0–17.0 g/dL"
- **Standard reference** — source cited in a tooltip, with age/sex population stated

Route the fallback through the staging primitive:

```js
propose_reference_range({
  analyte: "Ferritin", low: 30, high: 400, unit: "ng/mL",
  source: "<cited standard>", population: "adult male",
  reason: "report printed no range for this analyte"
})
```

Staged — a standard range only applies after human approval. The human stays the authority on the yardstick; a wrong range makes a healthy value look alarming.

Render the numeric range **as text** beside every chart, in the results table, and in the heatmap legend — not only as a shaded band.

---

## 6. Tool surface

Register dynamically: core at load, plugin tools on mode selection, document-shaped schemas (doc IDs, page counts as enums) after ingest.

### Core

| Tool | Tier |
|---|---|
| `list_plugins`, `get_active_plugin` | read |
| `select_plugin` | attention |
| `list_documents` | read (metadata only) |
| `get_disclosure_policy` | read |
| `request_disclosure` | consent |
| `get_page_text` | **consent-gated** |
| `propose_mapping` | staged (shared) |
| `get_review_status` | readback |
| `get_audit_log` | read |
| `focus`, `annotate_chart` | attention |
| `get_goal`, `get_plan`, `get_adherence` | memory |

### Finance plugin

| Tool | Tier | Notes |
|---|---|---|
| `propose_transactions` | staged | `{date, description, amount, balance?, anchor}` |
| `reconcile_statement` | read | debits + credits vs printed closing balance |
| `list_categories`, `list_series` | read | |
| `find_recurring` | read | repeating-charge detection |
| `plot_spend_by_category` | attention | stacked area over time |
| `plot_cashflow` | attention | income vs expense + savings-rate line |
| `plot_projection` | attention | months-to-goal curve |
| `propose_savings_plan` | staged | renders the slider surface — see §8 |

### Labs plugin

| Tool | Tier |
|---|---|
| `propose_results` | staged |
| `propose_reference_range` | staged |
| `list_series` | read |
| `plot_series`, `plot_panel`, `plot_heatmap` | attention |
| `propose_diet_plan` | staged |

**~24 tools; only 6 can mutate anything, none without a click.** Put that sentence in the README and the write-up.

**Status footer on every return:** `[3 proposals pending · 12 categories · 2 grants · goal: car £40k]`

---

## 7. Finance journey (primary — build end to end)

### The hook
Twelve months of statements, and you genuinely don't know where the money went.

| # | Actor | Step |
|---|---|---|
| 1 | Human | Picks "Bank statements". Loads 12 PDFs (or one-click samples) |
| 2 | Page | OPFS, pdf.js render, text layer + positions, redaction scan |
| 3 | Human | Redaction panel: account number, sort code, address masked. Preview of what the agent will see |
| 4 | Agent | `list_documents` → 12 statements, Sep 2025 – Aug 2026 |
| 5 | Agent | `get_page_text({doc:1, page:2})` → **JIT consent card** → *Allow this session* |
| 6 | Agent | `propose_transactions` — rows with `{date, description, amount, balance, anchor}` |
| 7 | Page | Stages, validates, renders **split screen**: PDF left, rows right, hover-to-highlight source |
| 8 | Page | **`reconcile_statement`**: debits + credits match the printed closing balance on all 12. *The page verifying the agent's arithmetic before the human looks* |
| 9 | Human | Accepts; rejects the row pulled from the "Balance brought forward" line |
| 10 | Agent | `get_review_status` → learns the pattern, skips it on the remaining 11 |
| 11 | Page | Commits — 1,847 transactions, each with `{doc, page, anchor}` |
| 12 | Agent | `propose_mapping` — **rules, not rows**: `merchant ILIKE '%amzn%'` → Amazon → Shopping |
| 13 | Human | Approving one card classifies 200 transactions. Rejects one: *"some of that is groceries"* |
| 14 | Agent | Splits by basket size (<£40 → Groceries), re-proposes. Human accepts |
| 15 | Agent | `find_recurring` → 14 repeating charges, **including 3 the human forgot they were paying for** |
| 16 | Agent | `plot_spend_by_category` (stacked area), `plot_cashflow` (income vs expense + savings-rate line) |
| 17 | Page | Flags month-over-month drift and one-off spikes |
| 18 | Human | Sets a goal in the picker: **Car, £40,000**, current savings £6,200 |
| 19 | Page | Computes from real data: surplus £1,180/mo → **34 months** |
| 20 | Agent | `get_goal` → `propose_savings_plan` with per-category adjustments and rationales drawn from the transactions |
| 21 | Page | Renders **one slider per adjustment**, pre-set to the proposal, projection chart above |
| 22 | Human | Drags. Projection recomputes in local JS, instantly. **34 months → 19** |
| 23 | Human | Sets dining to 340 not 250, accepts subscriptions, notes *"not cutting the gym"* |
| 24 | Agent | `get_review_status` → revises the rest around the real constraints |
| 25 | Human | Reloads, opens a **fresh chat**. Agent calls `get_plan` + `get_goal`, resumes with full history |
| 26 | Human | Audit log: every disclosure, every denial, zero bytes uploaded |
| 27 | Human | Exports categorised CSV |

### Financial-advice guardrail (non-negotiable)

- The page computes **arithmetic only**: at £X/month you reach £40k in N months.
- Any assumed return rate is a **slider the human sets**, showing sensitivity rather than a prediction.
- The agent proposes **spending adjustments derived from the user's own transactions** — never products, allocations, or instruments.
- **No tool exists** that recommends a financial product.
- Visible line: *Projections are arithmetic on your own data, not financial advice.*

---

## 8. Sliders as a continuous review surface

The agent doesn't return a plan as prose:

```js
propose_savings_plan({
  goal: { label: "Car", target: 40000, current: 6200 },
  adjustments: [
    { category: "Dining out", currentMonthly: 420, targetMonthly: 250,
      rationale: "38 transactions/mo, 3× your grocery spend" },
    { category: "Subscriptions", currentMonthly: 96, targetMonthly: 44,
      rationale: "4 unused per your own cancellation pattern" }
  ]
})
```

The page renders a slider per adjustment, pre-positioned at the agent's proposal, projection chart above. **Recompute locally in JS on drag — never a round trip to the agent**, or the feel dies.

`get_review_status` returns what the human actually settled on, including per-category deltas and free-text notes. Binary accept/reject becomes **continuous** approval — same primitive, richer surface.

Same pattern serves the labs diet plan: goal seeded one-click from an out-of-range analyte, plan drafts as an editable 7×3 grid, human strips items and notes exclusions, agent revises.

---

## 9. Data model

```
OPFS/
  docs/<docId>.pdf              raw bytes (never leave)
  pages/<docId>/<n>.json        text layer + positions + redaction spans
  commits.jsonl                 append-only accepted records
  mappings.jsonl                approved canonicalisations (rules, not rows)
  ranges.jsonl                  approved reference ranges (labs)
  grants.json                   persisted "always" grants
  audit.jsonl                   append-only disclosure log
  memory.json                   goal, plan, adherence, exclusions

memory (never persisted)
  staging[]                     pending proposals
  sessionGrants[]
```

### Invariants — these *are* the product

1. **Only accept handlers write to `commits.jsonl`.** No tool ever does.
2. **Staging is memory-only.** A reload discards unreviewed agent intent — correct behaviour; say so in the README.
3. **Redaction applies to every read path, including error strings.** A masked account number leaking through a pdf.js exception would destroy the claim. Sanitize every return path. Add a test.
4. **Every committed value carries `{doc, page, anchor}`.** No orphan numbers.
5. **Every consent-gated call writes an audit entry**, including denials.
6. **Mappings and ranges are applied at read time**, never destructively. Provenance survives.

---

## 10. Repo layout

```
/
  LICENSE                MIT — first real commit, must render in GitHub About
  README.md
  index.html
  src/
    core/
      ingest/ pdf.ts, textlayer.ts
      storage/ opfs.ts, commits.ts, audit.ts, memory.ts
      redact/ engine.ts, patterns.ts
      consent/ policy.ts, jit.ts, grants.ts
      staging/ store.ts
      charts/ trend.ts, stacked.ts, heatmap.ts, projection.ts
      planner/ goals.ts, project.ts, sliders.ts
      mcp/ registry.ts, middleware.ts
    plugins/
      finance/ index.ts, schema.ts, redaction.ts, tools.ts, views.ts, reconcile.ts
      labs/    index.ts, schema.ts, redaction.ts, tools.ts, views.ts, ranges.ts
    pages/
      Home.tsx           §17.3 — tiles, instructions, starter prompts
      Workspace.tsx      plugin-agnostic shell for /finance and /labs
      Audit.tsx          /audit
      Grants.tsx         /grants
      Tools.tsx          /tools — rendered from the registry
      HowItWorks.tsx     /how-it-works
      Disclosures.tsx    /disclosures — §18.2
    ui/
      AgentStatusPill.tsx  §17.4
      Disclaimer.tsx       §18.1 inline placements
  fixtures/
    finance/ statement-2025-09.pdf … (12)
    labs/    northwood-2021.pdf … (6)
    GENERATOR.md          how fixtures were made + what's planted
  docs/
    ARCHITECTURE.md       three authorities, five-stage pipeline, plugin interface
    WEBMCP.md             every tool, tier, consent behaviour
```

---

## 11. Day-by-day

~10h/day. Each day ends with a **gate** — a binary check that decides the next day.

### Day 0 — Fri Aug 28 (today, 4h)

Riskiest unknowns first. Do not write a feature until these pass.

- [ ] Vite + TS skeleton. `LICENSE` (MIT) as the first substantive commit
- [ ] Deploy empty page to Cloudflare Pages
- [ ] Register a trivial `ping` tool; confirm an agent can call it in **ChatGPT's in-app browser AND Chrome with WebMCP enabled**. Highest-risk item in the project
- [ ] Verify OPFS works in the in-app browser; if not, switch to IndexedDB **today**
- [ ] Generate 12 finance fixtures from your real statements: **anonymise merchant names, scale amounts by a constant, replace account details**. Plant deliberately: one statement with the table split across a page break; a "Balance brought forward" line that mimics a transaction; three variant spellings of one merchant; **one decimal error (£54.00 vs £5.40)**
- [ ] `fixtures/GENERATOR.md` documenting what's planted — judges reading it see deliberate test design

**GATE 0:** a tool call succeeds from an agent in both environments, and storage works.

### Day 1 — Sat Aug 29 (10h)

Core: ingest → redaction → consent → audit.

- [ ] pdf.js render + text layer with positions (3h)
- [ ] Redaction engine + finance patterns + **preview panel** with per-span toggles (2h)
- [ ] Consent middleware: allow / structured-deny / JIT-pending with 60s timeout (2.5h)
- [ ] JIT consent card, three grant levels (1h)
- [ ] Audit log store + table with the "nothing has been uploaded" header (1.5h)

**GATE 1:** agent calls `get_page_text`, gets blocked, triggers a consent card, disclosure lands in the audit log. *This is the thesis working end to end.*

### Day 2 — Sun Aug 30 (10h)

Extraction and review.

- [ ] Finance plugin: schema, identity, validation (1.5h)
- [ ] Staging store + `propose_transactions` (1.5h)
- [ ] **Split-screen review**: PDF left, rows right (3h)
- [ ] Hover-to-highlight source. *If geometry fights you, fall back to text-search highlighting — near-identical visually, a fraction of the time* (2h)
- [ ] `reconcile_statement` (0.5h — high value, low cost)
- [ ] Accept/reject/edit → commits with provenance; `get_review_status` (1.5h)

**GATE 2:** agent proposes → human rejects with a note → agent reads it back and adapts. *If this slips past Sunday night, cut the labs plugin now and say so out loud.*

### Day 3 — Mon Aug 31 (10h)

Canonicalisation and charts.

- [ ] `propose_mapping` as **rules** + review card showing the rule, the match count, and 5 sample matches (2.5h)
- [ ] Apply mappings at read time (1h)
- [ ] `find_recurring` (1h — the delight moment)
- [ ] Stacked-area spend by category, hand-rolled SVG (2.5h)
- [ ] Cashflow chart with savings-rate line (1.5h)
- [ ] Drift + spike flagging; `annotate_chart`, `focus` (1.5h)

**GATE 3:** the planted decimal error is visible on a chart, clickable to its source page, rejectable, re-extractable. *Your best 15 seconds of video.*

### Day 4 — Tue Sep 1 (10h)

Goal, sliders, memory, polish.

- [ ] Goal picker + projection engine (1.5h)
- [ ] `propose_savings_plan` + **slider surface with live local recompute** (3h)
- [ ] `get_plan`, `get_goal`, memory store (1h)
- [ ] **Agent-off pass** — cold URL: sample loader, category sidebar, manual charts, audit log, empty and error states. A judge must see a coherent product with no agent attached (2.5h)
- [ ] Home page per §17.3 — tiles, instructions, starter prompts, privacy strip (1h)
- [ ] **Agent status pill** per §17.4 (0.5h — cheap insurance against a judge in the wrong browser)
- [ ] `/tools` page rendered from the registry (0.5h — high-value judge artifact)
- [ ] `/disclosures` page per §18.2 + inline disclaimers per §18.1 (0.5h)
- [ ] Wordmark, hero copy, `<title>`, OG tags + OG image (0.5h)
- [ ] Full run-through in **both** judge environments (1h)

**GATE 4 (the big one):** is all of the above *done*, including agent-off?
→ **Yes:** add the labs plugin Wednesday AM (schema + redaction + ranges + trend/band + 6 fixtures, ~4h)
→ **No:** ship finance only. Commit `plugins/labs/` as an unwired config with a README note — claims the plugin architecture honestly without spending the day

### Day 5 — Wed Sep 2 (10h)

**Code freeze at noon. No exceptions.** Anything found after noon goes in the README, not the code.

- [ ] AM: labs plugin *iff* Gate 4 passed. Otherwise buffer
- [ ] 12:00 freeze, tag the commit
- [ ] Shoot the video (§12). Budget 3h, expect 4
- [ ] Submission description (§13)
- [ ] README + `docs/ARCHITECTURE.md` + `docs/WEBMCP.md`
- [ ] Verify LICENSE renders in the GitHub About sidebar
- [ ] YouTube upload, **public**, verify in incognito
- [ ] Fill the Devpost form completely — don't submit yet

### Day 6 — Thu Sep 3 (deadline 1:00pm PDT)

- [ ] 08:00 final check: live URL in both environments, repo public, video public, LICENSE visible
- [ ] **09:00 submit.** Four hours of buffer
- [ ] Don't touch code after submitting

---

## 12. Video — 3:00 hard cap

| Time | Shot | Says |
|---|---|---|
| 0:00–0:18 | 12 statements load. **DevTools network panel open and empty** | Nothing uploads |
| 0:18–0:35 | Redaction panel: account number and address masked, preview | The human filters first |
| 0:35–0:58 | Agent requests page text → **consent card** → *Allow this session* → audit entry | The page is a gateway |
| 0:58–1:25 | Extraction → split screen → hover-to-source → reject the brought-forward row → agent adapts. **Reconciliation passes on all 12** | Verified extraction, page checks the agent |
| 1:25–1:50 | Category **rules**: one approval classifies 200 rows; reject "some is groceries" → agent splits by basket size | Human authorizes rules, not rows |
| 1:50–2:10 | Charts. **The absurd point. Click → source page → reject → agent corrects.** `find_recurring` surfaces 3 forgotten subscriptions | Charts as a second review surface |
| 2:10–2:40 | Goal: £40k car → 34 months → plan drafts → **drag the sliders → 19 months** → notes "not cutting the gym" → agent revises | Continuous, human-authorized planning |
| 2:40–2:52 | **Reload. Fresh chat.** Agent calls `get_plan`, resumes with full history | The page is the agent's memory |
| 2:52–3:00 | Audit log: *"47 calls · 12 authorized · 3 denied · 0 bytes uploaded"* + a glance at `registerTool` | The receipt |

**If you must cut:** the recurring-subscriptions beat goes first (buys 8s), then trim the extraction segment. **Never cut the consent card, the sliders, or the audit log** — they *are* the entry. Record audio live; no music (copyright rule).

---

## 13. Submission checklist

### Live URL
- [ ] Works in ChatGPT's in-app browser
- [ ] Works in Chrome with WebMCP enabled
- [ ] No auth (simpler for judges)
- [ ] Sample fixtures loadable in one click — a judge must never need to find a PDF
- [ ] Agent status pill correctly reports "no agent" in plain Chrome
- [ ] `/disclosures` reachable from the footer on every route
- [ ] `/tools` renders all tools with tiers
- [ ] Starter prompts on the home page, with a copy button

### Repo
- [ ] Public on GitHub
- [ ] `LICENSE` (MIT) detected and **visible in the About sidebar** — stated twice in the rules, so it's checked
- [ ] All source, assets, run instructions
- [ ] `document.modelContext.registerTool({...})` greppable in `src/core/mcp/registry.ts` + `src/plugins/*/tools.ts`
- [ ] **Real commit history Aug 28 – Sep 2**, several commits a day. A single dump on Sep 2 invites the "meaningfully extended" question
- [ ] `docs/WEBMCP.md` listing all ~24 tools, tier, and consent behaviour

### Video
- [ ] Under 3:00, audio narration covering what you built and how you used WebMCP
- [ ] Public on YouTube, verified in incognito
- [ ] No third-party trademarks, no copyrighted music

### Text description — four headings, matching the prompts

**Why this use case is a strong fit for WebMCP**
Bank statements and lab reports are exactly the documents people cannot upload — and every existing PDF-to-data tool requires uploading. Because WebMCP tools execute inside the page, in the user's own session, the documents stay in the browser while an agent still does real work on them. The page becomes a consent boundary no server-side MCP can be: it decides, per call, what the model is shown, and it can ask the human in a UI the human is already looking at.

**How it creates a better user experience**
The privacy claim is verifiable rather than promised — open the network panel and watch it stay empty. Authorization happens in context, as a card in the page, not as a policy agreed to once. Nothing the agent produces is committed until approved against the source page, so a wrong extraction is visible before it becomes your data. And the page checks the agent: extracted debits and credits must reconcile to every statement's printed closing balance.

**What people and agents can do together that was difficult or impossible before**
An agent can work on documents it is not allowed to keep, and cannot commit anything without a human click. `get_review_status` closes a loop that previously did not exist: the human's accept, reject, note — or slider position — becomes structured input the agent reads and adapts to *mid-task*. Reject the row pulled from a "balance brought forward" line and it stops extracting them from the other eleven statements. Drag the dining-out slider to a number you'll actually live with, and it re-plans the rest around your real constraint. That needs a surface both parties can see at once. And because the page persists state the model doesn't, a fresh chat next week resumes with your full history: the agent is stateless, the page is not.

**How we implemented WebMCP**
~24 tools registered via `document.modelContext.registerTool()`, in four authority tiers: read, attention (changes only the screen), staged (mutates nothing until approved), and memory. Only six can alter stored data, none without a human click. Tools register dynamically — core at load, plugin tools on mode selection, document-shaped schemas after ingest, so document IDs and page counts are enums rather than free strings. Every consent-gated call passes through middleware returning data, a structured refusal that tells the agent what to ask for instead, or a pending promise resolved by a consent card in the page. Every decision is written to an append-only audit log the agent can also read. Two plugins — bank statements and blood test reports — share one five-stage pipeline, with canonicalisation and goal-planning as common core. Stack: Vite + TypeScript, pdf.js, OPFS, hand-rolled SVG charts, zero backend, Cloudflare Pages.

---

## 14. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| WebMCP not working in ChatGPT's in-app browser | Med | **Gate 0, today** |
| OPFS unavailable in the in-app browser | Med | IndexedDB fallback decided Day 0 |
| pdf.js text-layer geometry fights you | High | Text-search highlighting fallback, budgeted not discovered |
| Blocking tool promise wedges the agent | Med | 60s timeout built with the promise |
| Two plugins eat the week | High | Gate 4. Labs is Wednesday-AM-only, or unwired config |
| Video overruns 3:00 | High | Script to 2:50; pre-agreed cuts |
| Redaction leak via error strings | Low / severe | Sanitize every return path incl. exceptions. Add a test |
| Slider recompute feels laggy | Med | Local JS only, never an agent round trip |
| Read as giving financial or medical advice | Med | Goal inversion, arithmetic-only projections, human-set return rate, no product-recommending tool, visible disclaimers |
| Real financial data in a public video | Low / severe | Anonymised fixtures only. Never record your live data |
| LICENSE not detected | Low / cheap | Verify the About sidebar Day 0 |
| Scanned PDFs in a judge's own files | Med | "Text-layer PDFs only" in the empty state and README. No OCR |

---

## 15. Explicitly out of scope

Put this in the README. Stated scope reads as judgment; discovered gaps read as incompleteness.

- OCR / scanned documents (text-layer PDFs only)
- Financial product, allocation, or instrument recommendations
- Clinical interpretation, diagnosis, dosing, supplement guidance
- Nutrition databases or macro computation
- Tax calculation
- Multi-user, accounts, sync, sharing
- A third plugin — the interface is there; two instantiations prove it
- Mobile beyond "doesn't break"

---

## 16. Where the points come from

| Criterion | What earns it |
|---|---|
| **WebMCP Leverage** | ~24 tools in four authority tiers; consent middleware with instructive denials; JIT consent resolving a pending tool promise; dynamic registration with document-shaped schemas; readback loop including continuous slider state; durable page-owned memory |
| **Execution** | Works with the agent off. One-click fixtures. Empty and error states. Both judge environments tested. Reconciliation self-check. Export produces a real artifact |
| **Potential Impact** | An audience that cannot upload — anyone with a bank statement or a lab report — locked out of every AI data tool on the market. Plugin architecture generalises the fix |
| **Creativity & Ambition** | A consent gateway for agents is a new primitive, not a new feature. Staged proposals, sliders as continuous approval, an audit log of what left the page, and the page as durable memory for a stateless model |

---

## 17. SPA structure and page design

Single page app, client-side routing, no server. Every route is a deep link so a judge can be sent straight to any surface.

### 17.1 Route map

| Route | Purpose |
|---|---|
| `/` | Home — plugin tiles, instructions, agent status |
| `/finance` | Finance workspace (default tab: documents) |
| `/finance/review` | Split-screen extraction review |
| `/finance/categories` | Category rules + mapping review |
| `/finance/insights` | Charts, recurring charges, drift |
| `/finance/goal` | Goal + projection + slider surface |
| `/labs`, `/labs/review`, `/labs/ranges`, `/labs/insights`, `/labs/plan` | Labs equivalents |
| `/audit` | Audit log — every disclosure and denial |
| `/grants` | Active grants, per-grant revoke |
| `/tools` | **Human-readable tool reference** — all ~24 tools, tier, consent behaviour |
| `/how-it-works` | The three authorities, the five-stage pipeline, a diagram |
| `/disclosures` | Legal — see §18 |

`/tools` is a judge-facing artifact, not documentation debt. It renders from the same registry that feeds `registerTool()`, so it can never drift, and it makes the depth of your WebMCP implementation legible in fifteen seconds. Build it as a loop over the registry — an hour, maybe less.

### 17.2 Persistent chrome

Present on every route:

- **Wordmark** top-left, links to `/`
- **Agent status pill** top-right — see 17.4
- **Privacy strip** in the footer: `Nothing uploaded · 0 bytes sent to any server · [Audit log]`
- **Footer links:** How it works · Tool reference · Disclosures · GitHub

### 17.3 Home page

```
┌──────────────────────────────────────────────────────────────┐
│  No Upload                            ● Agent connected      │
│                                                              │
│  Let an agent read your private documents                    │
│  without uploading them.                                     │
│                                                              │
│  Your PDFs stay in this browser tab. You choose what the     │
│  agent is allowed to see, one request at a time.             │
│                                                              │
│  ┌────────────────────────┐  ┌────────────────────────┐     │
│  │  Financial statements  │  │  Blood test reports    │     │
│  │                        │  │                        │     │
│  │  Turn months of bank   │  │  Turn years of lab     │     │
│  │  PDFs into categorised │  │  PDFs into one verified│     │
│  │  spending and a        │  │  timeline with         │     │
│  │  savings plan.         │  │  reference ranges.     │     │
│  │                        │  │                        │     │
│  │  [Start]  [Samples]    │  │  [Start]  [Samples]    │     │
│  └────────────────────────┘  └────────────────────────┘     │
│                                                              │
│  How it works                                                │
│  1  Load your PDFs — they're stored in this tab only         │
│  2  Review what's masked before anything is shared           │
│  3  The agent asks; you authorize each request               │
│  4  Nothing is saved until you approve it                    │
│                                                              │
│  Try saying to your agent…                                   │
│  › "Extract the transactions from all my statements"         │
│  › "Categorise my spending and show me where it went"        │
│  › "I want to save £40,000 for a car — how long?"            │
│                            [Copy]                            │
│                                                              │
│  Nothing uploaded · Open your network panel and watch        │
│                                                              │
│  How it works · Tool reference · Disclosures · GitHub        │
└──────────────────────────────────────────────────────────────┘
```

**Copy, ready to paste:**

- H1: `Let an agent read your private documents without uploading them.`
- Sub: `Your PDFs stay in this browser tab. You choose what the agent is allowed to see, one request at a time.`
- Tile 1 title: `Financial statements` — body: `Turn months of bank PDFs into categorised spending, recurring-charge detection, and a savings plan you control.`
- Tile 2 title: `Blood test reports` — body: `Turn years of lab PDFs into one verified timeline, with reference ranges shown and sourced.`
- Privacy strip: `Nothing uploaded. Open your browser's network panel and watch it stay empty.`

**Tile behaviour:** `Start` opens the file picker for that plugin. `Samples` loads the bundled fixtures in one click — a judge must never need to find a PDF of their own. Both routes call `select_plugin` internally so the tool surface re-registers.

Give the finance tile a quiet `Start here` badge. Don't make the tiles visually equal — you want a judge's first click to land on your strongest flow.

### 17.4 Agent status pill — build this, it's cheap insurance

Top-right on every route, three states:

| State | Condition | Shown |
|---|---|---|
| **No agent** | `document.modelContext` undefined | `○ No agent detected` → click for connection instructions |
| **Ready** | API present, no calls yet | `◐ Agent can connect` |
| **Connected** | ≥1 tool call received | `● Agent connected · 12 calls` → links to `/audit` |

A judge in the wrong browser gets told so immediately, instead of concluding your app is broken. That is a real Execution risk and this is an hour's work.

Clicking `No agent detected` opens:

> **Connecting an agent**
> Open this page in ChatGPT's in-app browser, or in Chrome with WebMCP enabled, then ask your agent to work with your documents. No sign-in, no API key.
> This page works on its own too — load your PDFs and browse them without any agent.

### 17.5 The agent-off requirement

Every route must be fully usable with no agent attached. Concretely: load documents manually, browse extracted records in a table, pick a category or analyte from a sidebar and see its chart, set a goal and drag the sliders yourself, read the audit log. The agent makes all of this faster and can compose across steps — it is never the only way in.

This is the single most likely place to lose the Execution criterion. Budget the full 2.5h on Day 4 for it.

---

## 18. Legal, disclosures, and conditions

Two things: short inline disclaimers where the risk actually lives, and one `/disclosures` page that says everything properly. Stated limitations read as judgment; discovered ones read as carelessness.

### 18.1 Inline disclaimers — non-negotiable placements

| Where | Copy |
|---|---|
| Under any projection chart or slider surface | *Projections are arithmetic on your own data. Not financial advice.* |
| Under any lab chart or range badge | *Not medical advice. Reference ranges are shown with their source; discuss any changes with your doctor.* |
| On a standard-range badge | *Standard reference range — not from your report.* Tooltip: source + population (age/sex) |
| Diet plan header | *General dietary suggestions for a goal you selected. Not a treatment plan.* |
| Empty state, both plugins | *Text-layer PDFs only. Scanned images aren't supported.* |

### 18.2 `/disclosures` page — full copy

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

### 18.3 Terms of use — short form

Link from the footer as *Terms*; can live on the same `/disclosures` page under a heading.

> By using this app you accept that it is provided free, as-is, without warranty; that you are responsible for verifying any data it extracts; that it provides no financial, medical, legal, tax, or accounting advice; and that data you authorize for disclosure is thereafter governed by your agent provider's terms. Don't use it as a system of record.

### 18.4 A consequence worth honouring

**Do not add analytics.** Not Cloudflare Web Analytics, not Plausible, not a single beacon. Any outbound request contradicts the claim a judge is going to verify in their network panel — and it's the claim the entire entry rests on. This is also why the demo shot of an empty network panel works: it has to actually be empty.

---

## 19. Fixtures and anonymisation

You are building against twelve months of your own statements. The repo and the video must not contain them.

### 19.1 Anonymising your real data

1. Scale every amount by a single constant (e.g. ×0.83) so ratios and category structure survive but figures aren't yours
2. Replace merchant names with fictional equivalents — **keep the messiness**: the same merchant should still appear under 2–3 variant strings
3. Replace account numbers, sort codes, names, addresses with obvious fakes
4. Shift all dates by a fixed offset
5. Regenerate as PDFs with a layout that resembles a real statement — three fictional bank layouts across the twelve

### 19.2 Plant these deliberately

| Plant | Proves |
|---|---|
| Transaction table split across a page break | Agent-as-parser beats a naive parser |
| A `Balance brought forward` line that mimics a transaction | The reject → readback → adapt loop |
| Three variant spellings of one merchant | `propose_mapping` earning its place |
| **One decimal error (£54.00 vs £5.40)** | Charts as a second review surface |
| One statement with a slightly different column order | Robustness |
| For labs: HbA1c in mmol/mol on one report, % on two others; one analyte with no printed range | Unit harmonisation; range fallback |

### 19.3 `fixtures/GENERATOR.md`

Document how the fixtures were produced and exactly what is planted in each. A judge reading it sees deliberate test design rather than luck — and it doubles as evidence for the "meaningfully extended during the submission period" requirement.

**Never record your live data.** Not in the video, not in a screenshot, not in an OG image.
