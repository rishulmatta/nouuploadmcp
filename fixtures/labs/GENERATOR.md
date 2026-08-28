# Lab fixture generation

The lab report fixtures in `fixtures/labs/` are synthetic blood test reports for a
fictional "Northwood Labs", produced by `scripts/generate-lab-fixtures.ts`. They
contain no real personal or medical data.

## How they were made

- 4 quarterly reports, 2025-09 to 2026-06, one fictional patient.
- Three panels per report (Lipid Panel, Complete Blood Count, Metabolic Panel), with
  a fourth (Thyroid and Vitamins) added on the 2026-03 report to exercise multiple
  panels appearing across a document set.
- Patient name, DOB, and MRN are obvious fakes, present to exercise `labsRedactionRules`.

## Deliberate plants

| Plant | Location | What it proves |
|---|---|---|
| Ferritin and LDL Cholesterol never print a reference range | every report | `propose_reference_range` earning its place — the agent must propose a cited standard range, and nothing is interpreted as "low"/"high" until a human approves it. |
| Ferritin trends down across all 4 reports (18 → 15 → 12 → 10 ng/mL), ending well under the standard 30 ng/mL floor | all reports | `find_out_of_range` + `propose_diet_plan` — a real out-of-range trend to seed a diet goal from. |
| LDL Cholesterol trends up (110 → 132 mg/dL) | all reports | A second, independent trend line for `plot_panel`/`plot_heatmap`. |
| A panel only present on one report (Thyroid and Vitamins) | `northwood-2026-03.pdf` | Robustness to a document set where not every report has the same panels. |
| Explicit H/L flags alongside printed ranges | most rows | Available for the agent to cross-check against `find_out_of_range`'s own out-of-range computation. |

## Regenerating

```bash
npx tsx scripts/generate-lab-fixtures.ts
cp fixtures/labs/*.pdf public/fixtures/labs/
```

The second line is required because, like the finance fixtures, `public/fixtures/labs/`
is what's actually served — it's a copy, not a symlink.

## Note

No real medical data was used or recorded in creating these fixtures.
