---
name: golden-file-testing
description: Verify the calculation engine against a real reference quote/invoice document
---

## Purpose

Prove the engine's output matches a real-world document exactly — this is
the project's actual correctness bar, not "looks plausible."

## When to use

- Adding a jurisdiction (see `add-jurisdiction` skill)
- User reports a total that looks wrong, especially after editing discount/
  delivery/line items
- Any change to `packages/engine/src/calculate.ts`

## Inputs

A reference document's printed numbers (subtotal, discount, delivery, tax,
grand total) and, ideally, the line items that produced them.

## Procedure

1. Build a `Quote` fixture in `packages/engine/test/fixtures/` reproducing
   the document's line items, discount, delivery, jurisdiction, document
   type — see `au-quotes.ts` / `np-quotes.ts` for the pattern.
2. Add assertions in `packages/engine/test/golden.test.ts` for every
   printed figure, not just the grand total — subtotal, discount amount,
   tax amount, AND generated labels (label bugs are half of what this
   project exists to catch).
3. Run `npm run test` (repo root or `packages/engine`).
4. If asserting a *corrected* value where the source document was wrong
   (e.g. mislabeled inclusive/exclusive tax), say so in a comment — the
   fixture should make clear which numbers are "as printed" vs "as
   corrected."

## Verification

All assertions pass. If they don't, the bug is almost always one of:
tax basis (inclusive/exclusive) or derivation (divisor/additive) mismatch,
discount applied in the wrong units (percent vs fraction — see
`.Codex/state/discoveries.md` for the exact bug that happened here),
or rounding stage (`rounding.applyAt: 'line'` vs `'total'`).

## Output

- `.Codex/logs/development-log.md` — one line: what was verified, against
  what document, pass/fail
