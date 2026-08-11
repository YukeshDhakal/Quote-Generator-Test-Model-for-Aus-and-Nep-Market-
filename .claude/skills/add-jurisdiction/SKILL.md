---
name: add-jurisdiction
description: Add a new tax jurisdiction (country) to the quote engine — profile creation, registration, golden-file tests
---

## Purpose

Add a new country's tax rules as a jurisdiction profile, without touching
the calculation engine. This is the architecture's proof case — if this
takes more than a profile + tests, something is wrong.

## When to use

User asks to add/support a new country/jurisdiction for quoting.

## Inputs required from the user

- Tax name, rate, basis (inclusive/exclusive), derivation (divisor/additive)
- Calendar system, digit grouping convention
- Seller identifier (e.g. ABN/PAN equivalent)
- Document type(s) and whether tax is shown on each
- Ideally: a real reference quote/invoice document with actual numbers to
  verify against (this is how AU and NP were built — see
  `packages/engine/test/fixtures/`)

## Procedure

1. Read `packages/engine/src/jurisdictions/au.ts` or `np.ts` as a template.
2. Create `packages/engine/src/jurisdictions/<code>.ts` implementing
   `JurisdictionProfile` (see `packages/engine/src/types.ts`).
3. Register it: add to `PROFILES` map in `packages/engine/src/index.ts`
   export, `packages/api/src/server.ts` `PROFILES` const, and
   `packages/web/src/pages/*` `PROFILES` const (grep for `AU_PROFILE` to
   find every registration site — there are ~4).
4. If a reference document exists: add a fixture in
   `packages/engine/test/fixtures/` and golden-file assertions in
   `packages/engine/test/golden.test.ts` (see existing AU/NP fixtures for
   the pattern — assert totals AND labels, not just totals).
5. Update the jurisdiction Selects' `items` maps in the web app (signup
   form, business settings) to include the new option.

## Verification

- `npm run test` (engine) — new golden fixture passes
- `npm run build` (web) — typecheck passes
- If a reference document was provided: totals must match it exactly, and
  any label bug in the original document should be asserted as *corrected*
  in the fixture (see AUQU0085's "Subtotal ex-GST" bug for the pattern)

## Output — record in state files

- `.claude/state/architecture.md` — add the jurisdiction to the "Live
  jurisdictions" list
- `.claude/logs/development-log.md` — one line: jurisdiction added, fixture
  source, test count
