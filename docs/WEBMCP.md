# WebMCP tool surface

Tools register dynamically via `document.modelContext.registerTool()`. Core tools load at startup; plugin tools load when a plugin is selected; document-shaped schemas update after ingest. The implementation lives in [`src/core/mcp/registry.ts`](../src/core/mcp/registry.ts).

## Registration

Each internal tool specification has a stable name, description, typed parameters, authority tier, and handler. The registry converts those parameters into a JSON input schema and exposes the result through WebMCP:

```ts
document.modelContext.registerTool({
  name: spec.name,
  description: spec.description,
  inputSchema,
  execute: async (input) => registry.invoke(spec.name, input),
})
```

For host compatibility the implementation checks `window.modelContext`, `document.modelContext`, and `navigator.modelContext`. It polls for late injection and re-syncs the tool surface when an agent context becomes available. Dynamic replacement is tied to an `AbortController` signal so stale plugin registrations can be retired.

## Authority tiers

| Tier | Meaning |
|---|---|
| read | Returns data, changes nothing. |
| attention | Changes only the screen. |
| consent | May return data only after policy + grant check. |
| staged | Proposes a change; nothing is committed until approved. |
| memory | Reads or writes durable page-owned state. |

## Core tools

| Tool | Tier | Description |
|---|---|---|
| `ping` | read | Confirm the page is reachable. |
| `list_plugins` | read | List available plugins. |
| `select_plugin` | attention | Switch active plugin. |
| `list_documents` | read | List documents loaded into the active plugin's document set only — never cross-listed with another plugin's documents. |
| `get_disclosure_policy` | read | Get policy + grants. |
| `get_page_text` | consent | Get page text with redaction; requires consent if denied fields present. |
| `request_disclosure` | consent | Request JIT disclosure for a denied scope. |
| `get_audit_log` | read | (planned) Return audit entries. |
| `get_goal` | memory | (plugin) Read current goal. |
| `get_plan` | memory | (plugin) Read current plan. |

## Finance plugin tools

| Tool | Tier | Description |
|---|---|---|
| `propose_transactions` | staged | Scan statements and propose transaction rows. |
| `get_review_status` | read | Pending/accepted/rejected counts + notes. |
| `reconcile_statement` | read | Verify debits + credits vs closing balance. |
| `list_categories` | read | Default spending categories. |
| `list_accepted_transactions` | read | Structured rows explicitly accepted by the human. Use for merchant classification and categorisation instead of requesting raw statement text. |
| `propose_category_mappings` | staged | Stage merchant/category rules from accepted transactions for human approval; no raw text or silent classifications. |
| `propose_mapping` | staged | Propose a merchant/category rule from the transactions' own descriptions (not a hardcoded guess). Approving one classifies every matching transaction, now and on future statements. |
| `find_recurring` | read | Repeating-charge detection. |
| `get_goal` | memory | Read current goal (savings or debt) — reflects the page live, including unsaved slider drags. |
| `get_plan` | memory | Read current plan (savings or repayment) — reflects the page live, including unsaved slider drags. Call before judging a plan rather than trusting what you last proposed. |
| `get_plan_feasibility` | read | Compare the current plan's required monthly amount against the account's real average monthly surplus. Use for "is this plan feasible?". |
| `propose_savings_plan` | staged | Draft a savings plan toward a goal with per-category adjustments. Renders as sliders on the page. |
| `propose_repayment_plan` | staged | Draft a debt repayment plan: balance, interest rate (APR), freed-up monthly payment. Renders as sliders on the page. |
| `get_spend_summary` | read | Aggregate income/expense/savings-rate/top-categories summary, for open-ended questions. |
| `get_spend_by_category` | read | Spend per category — total across all loaded statements, and `avgMonthly` (the true monthly average — use this one when drafting a plan). |
| `plot_spend_by_category` | attention | Render the "Spend by category" chart on the page. It never updates on its own (unlike the cashflow chart) since categorisation depends on mappings that may still be in flux — call this whenever you want the human to see current state. |
| `get_monthly_cashflow` | read | Net cashflow per month — this chart on the page updates automatically as commits change; no tool call needed. |

## Labs plugin tools

| Tool | Tier | Description |
|---|---|---|
| `propose_results` | staged | Scan lab reports and propose result rows. |
| `get_review_status` | read | Pending/accepted/rejected result counts + notes. |
| `propose_reference_range` | staged | Propose a cited standard range for an analyte the report didn't print one for. |
| `list_series` | read | Accepted results grouped by analyte, as time series with effective reference range. |
| `plot_series` | attention | Time series for one analyte. |
| `plot_panel` | attention | Time series for every analyte in a named panel. |
| `plot_heatmap` | attention | Matrix of every analyte × collection date, normalised to the reference band. |
| `find_out_of_range` | read | Latest accepted results currently outside their effective range. |
| `get_goal` | memory | Read current dietary goal. |
| `get_plan` | memory | Read approved diet plan. |
| `propose_diet_plan` | staged | Draft a diet plan with per-item adjustments targeting an out-of-range analyte. |
| `review_diet_plan` | attention | Final review of the approved plan against the latest results — flags each targeted analyte as resolved/unresolved/no-data, and flags any out-of-range result the plan doesn't cover. Renders on the page; summarise the flags in chat too. |

## Consent behaviour

- **Allowed** — data returned, audit entry written.
- **Denied** — structured refusal with available scopes.
- **Pending** — consent card shown; 60s timeout returns pending state.

## Suggested verification prompts

After loading the synthetic finance samples:

1. `List the available plugins and select finance.`
2. `Extract the transactions from all my statements and put them on the page for me to review.`
3. Accept only the rows you want processed and reject the rest, then ask: `Summarise the monthly cashflow from only my accepted transactions.`
4. `Use my accepted transactions—not raw statement text—to categorise my spending and show me a pie chart.`
5. Approve useful mappings, then ask: `I want to buy a Tesla Model Y and save $50,000 toward it. Use my actual monthly spending to propose a realistic savings plan and put it on the page.`
6. Accept the plan, move a slider, and add `Keep my gym membership` to its notes. Then ask: `Read the plan as it appears now. Is it still feasible, and what should I change to reach the Tesla goal sooner without cutting the gym?`

The final step verifies a core WebMCP benefit: the agent reads current page-owned state after a human edit instead of relying on stale conversational state.
