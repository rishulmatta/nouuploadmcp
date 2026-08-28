# Fixture generation

The finance fixtures in `fixtures/finance/` are synthetic bank statements produced by `scripts/generate-fixtures.ts`. They are designed to exercise the pipeline end to end while containing no real personal data.

## How they were made

- 12 months of statements, 2025-09 to 2026-08.
- Three fictional bank layouts rotate across the set: **Aurora Bank** (classic), **Coastal Trust** (modern), **Meridian Financial** (compact).
- All amounts are scaled by a single constant (×0.83) from a fictional baseline.
- Account holder name, address, account number, and sort code are obvious fakes.
- Merchant names are fictional.

## Deliberate plants

| Plant | Location | What it proves |
|---|---|---|
| Transaction table split across a page break | `statement-2025-12.pdf` | Agent-as-parser beats a naive single-page parser. |
| `Balance brought forward` line that mimics a transaction | First page of every statement | The reject → readback → adapt loop. |
| Three variant spellings of one merchant | `Starbrew Coffee`, `STARBREW COFFEE`, `Starbrew Coffee Ltd` across statements | `propose_mapping` earning its place. |
| Decimal error (£54.00 vs ~£5.40) | `statement-2026-02.pdf`, one Starbrew transaction | Charts as a second review surface. |
| Slightly different column order | Meridian Financial (`compact`) layout | Robustness to layout variation. |
| Recurring charges, including forgotten ones | StreamFlix, FitLab Gym, CloudPower Energy, AudioWave, NewsPlus Digital, CloudSync Pro, Premium Toolkit | `find_recurring` surfacing subscriptions. |

## Regenerating

```bash
npx tsx scripts/generate-fixtures.ts
```

This overwrites the PDFs in `fixtures/finance/`.

## Note

No real financial data was used or recorded in creating these fixtures.
