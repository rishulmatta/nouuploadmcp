# Architecture

No Upload is a local consent gateway: the documents stay in the browser, and the page decides what an agent is allowed to see.

## Three authorities the page keeps

1. **Disclosure** — nothing reaches the agent without a policy match or a human grant.
2. **Commits** — the agent proposes; only a human click writes data.
3. **Memory** — state persists in the page across sessions; the agent is stateless.

## Five-stage pipeline

Both plugins share the same shape:

| Stage | Finance | Labs |
|---|---|---|
| 1 Extract | transactions from statement PDFs | results from report PDFs |
| 2 Canonicalise | merchant string → merchant + category | analyte + unit harmonisation |
| 3 Analyse | category spend, recurring, savings rate | trend vs reference band |
| 4 Plan vs human goal | savings plan with sliders | dietary plan grid |
| 5 Persist | goal + plan + exclusions | same |

## Plugin interface

Plugins provide: redaction rules, record schema, validation, canonicalisation, views, band source (labs), goal types, plan schema, tools, and exporters. Core handles ingest, storage, consent, staging, charts, planning, MCP registry, and memory.

## Storage

- `docs/<id>.pdf` — raw bytes, never leaves the device.
- `pages/<id>/<n>.json` — text layer + positions.
- `commits.jsonl` — append-only accepted records.
- `mappings.jsonl` — approved canonicalisation rules.
- `grants.json` — persisted "always" grants.
- `audit.jsonl` — append-only disclosure log.
- `memory.json` — goal, plan, adherence, exclusions.

## Invariants

- Only accept handlers write to `commits.jsonl`.
- Staging is memory-only; reload discards unreviewed proposals.
- Redaction applies to every read path, including error strings.
- Every committed value carries `{doc, page, anchor}`.
- Every consent-gated call writes an audit entry.
- Mappings and ranges are applied at read time, never destructively.
