# WebMCP tool surface

Tools register dynamically via `document.modelContext.registerTool()`. Core tools load at startup; plugin tools load when a plugin is selected; document-shaped schemas update after ingest.

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
| `list_documents` | read | List loaded documents. |
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
| `find_recurring` | read | Repeating-charge detection. |
| `get_goal` | memory | Read savings goal. |
| `get_plan` | memory | Read approved savings plan. |
| `propose_savings_plan` | staged | Draft plan with per-category adjustments. |

## Labs plugin tools

Secondary plugin, present as an unwired skeleton. Planned: `propose_results`, `propose_reference_range`, `list_series`, `plot_series`, `plot_panel`, `plot_heatmap`, `propose_diet_plan`.

## Consent behaviour

- **Allowed** — data returned, audit entry written.
- **Denied** — structured refusal with available scopes.
- **Pending** — consent card shown; 60s timeout returns pending state.
