# Architecture

Update only when architecture changes, not on every task.

## Monorepo layout

npm workspaces, `packages/engine`, `packages/api`, `packages/web`.

## Engine (`packages/engine`)

Pure functions, no I/O. `calculateQuote()` runs a step-registry driven by
`profile.calculationOrder` (array of step names → functions in
`calculate.ts`) — a jurisdiction can reorder/omit steps with **zero code
changes**, which is the architecture's actual load-bearing claim (PRD
Phase 4 proof case). Don't hard-code step sequence anywhere.

Live jurisdictions: **AU** (GST 10%, inclusive/divisor-11, Gregorian),
**NP** (VAT 13%, exclusive/additive, Bikram Sambat, lakh/crore grouping,
amount-in-words — English rendering only, not real Devanagari ne_IN yet).

## API (`packages/api`)

Express + `node:sqlite`. Auth: bcryptjs + JWT httpOnly cookie
(`auth.ts`), Google ID-token verification (no client secret needed).

Multi-tenancy: `users` → `businesses` (1:many) → everything else scoped by
`business_id`. A business is locked to **one** jurisdiction
(`business_settings.jurisdiction`, set once). Multi-jurisdiction operation
= multiple business profiles per user, switchable via session cookie
re-signing (`POST /api/auth/switch-business`).

Quote numbering: per-business-per-jurisdiction-per-doctype counter,
sequential/gapless, allocated in a SQLite transaction.

PDF: Puppeteer renders an HTML template built from the same `QuoteResult`
the web UI displays — one source of truth for numbers, not two.

## Web (`packages/web`)

React + Vite + Tailwind v4 + shadcn/ui. **shadcn/ui here uses Base UI
primitives, not Radix** (this project's `shadcn init` picked "base" style)
— API differs from most shadcn examples online (e.g. `Select` needs an
`items` prop for `SelectValue` to show labels; `Checkbox` uses
`onCheckedChange`; buttons use a `render`/no-`asChild` pattern — use
`buttonVariants()` on a plain element instead of `asChild`).

Auth pages + landing page force `.dark` theme regardless of system
preference (marketing/auth identity is intentionally always-dark); the
authenticated app (dashboard etc.) follows the shadcn neutral theme.

`QuoteForm` (`components/QuoteForm.tsx`) is shared between New Quote and
Edit Quote — jurisdiction is always a fixed prop (read-only), never a form
choice, because it's locked at the business level.
