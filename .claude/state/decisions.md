# Decisions

Only record decisions with real consequences for future work. Skip trivial ones.

---

Decision: `node:sqlite` instead of `better-sqlite3`
Reason: This machine has no C++ build toolchain; `better-sqlite3` needs
native compilation and failed. Node 24's built-in `node:sqlite` needs zero
native build. Trade-off: no `.transaction()` helper — wrap multi-statement
writes in manual `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`.
Alternatives: install Visual Studio C++ workload (large, invasive);
sql.js/WASM (slower, more code).
Date: 2026-08-10
Status: Active

---

Decision: A business is locked to one jurisdiction; multi-jurisdiction
operation = multiple business profiles per user, switchable.
Reason: User's own framing — "a business can only be registered in one
place." A dashboard/UI mockup (2b) assumed one business could show
multiple jurisdictions side by side; resolved by keeping single-jurisdiction
lock per business (satisfies the legal constraint) and adding business
profile switching instead (satisfies wanting to operate in several
markets).
Alternatives: free per-quote jurisdiction picker (original v1 design,
allows spoofing/inconsistency); unrestricted multi-jurisdiction per
business (fails the "registered in one place" framing).
Date: 2026-08-11
Status: Active — jurisdiction is now never client-supplied on quote
create/edit, always derived server-side from the business's locked value.

---

Decision: Puppeteer (headless Chromium) for PDF export, not a declarative
PDF library (pdfmake).
Reason: User's explicit choice — renders the exact HTML/CSS the web app
already uses, avoiding two layout definitions that could drift apart.
Trade-off: heavier dependency (~300MB Chromium download), slower per-PDF.
Date: 2026-08-11
Status: Active

---

Decision: Percent discount input is whole-number percent (type "5" for
5%), converted to the engine's 0-1 fraction at the API boundary — plus
server-side validation rejecting percent values outside 0-1.
Reason: Real bug — a user typed "5" into a field labeled "e.g. 0.05 for
5%" and got a 500% discount (negative grand total, negative tax). The UI
label was correct but unintuitive; every real user will type "5" for 5%.
Alternatives: keep the fraction-input UI and rely on the label (proven to
fail); validate only, don't fix the input convention (still confusing).
Date: 2026-08-11
Status: Active. Server-side `validateDiscount()` in `server.ts` is
defense-in-depth — keep it even if the UI convention changes again.

---

Decision: shadcn/ui CLI monorepo alias bug worked around by adding
`compilerOptions.paths` directly to the root `tsconfig.json` (not just
`tsconfig.app.json`), and pinning `shadcn@4.15.0` with explicit
non-interactive flags.
Reason: `shadcn add` in this npm-workspaces monorepo wrote generated files
to a literal `packages/web/@/...` folder instead of resolving the `@/*`
alias — it apparently only reads the root tsconfig, not the referenced
`tsconfig.app.json`. Newer CLI version also hung on interactive prompts in
a non-interactive shell.
Date: 2026-08-11
Status: Active — if `shadcn add` is run again, check for a stray `@/`
folder under `packages/web/` before assuming it worked.
