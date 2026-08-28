# Labs plugin

Secondary plugin — wired. Blood test report PDFs are extracted into staged result
proposals, canonicalised to a standard analyte name, and reviewed the same way
finance transactions are (bulk accept/reject).

## Pipeline

1. **Extract** — `extract.ts` scans each page's text spans for panel headers, a
   `Collected <date>` line, and result rows (`analyte  value  unit  range  flag?`).
2. **Canonicalise** — `mappings.ts` maps printed analyte names (e.g. "Glycated
   Haemoglobin") to a canonical name + unit, and holds a small table of standard
   reference ranges cited by source and population.
3. **Reference ranges** — if a report doesn't print a range for an analyte, the
   agent can call `propose_reference_range` with a cited standard; it's staged and
   only applied (read-time only, never written back into the result) after a human
   approves it via the review panel.
4. **Diet plan** — the agent calls `find_out_of_range` to see which accepted
   results are currently outside their effective range, then `propose_diet_plan`
   with per-item adjustments; a human approves in the Dietary plan panel.

## Files

- `schema.ts` — `LabResult`, proposal types, `DietPlan`.
- `mappings.ts` — analyte canonicalisation + standard reference ranges.
- `extract.ts` — PDF page → result proposals.
- `tools.ts` — the WebMCP tool surface (`propose_results`, `propose_reference_range`,
  `list_series`, `plot_series`, `plot_panel`, `plot_heatmap`, `find_out_of_range`,
  `get_goal`, `get_plan`, `propose_diet_plan`) plus the human-only accept/reject
  functions the UI calls.
- `ReviewPanel.tsx`, `TrendsPanel.tsx`, `DietPlanPanel.tsx` — the review/approval UI.

## Storage

Lab results and diet plans live in their own files (`lab-results.jsonl`,
`ranges.jsonl`, `labs-memory.json`) — separate from finance's `commits.jsonl` /
`memory.json`, since the record shapes aren't compatible.
