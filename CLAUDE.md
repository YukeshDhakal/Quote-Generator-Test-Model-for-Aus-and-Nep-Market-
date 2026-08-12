# Quote Engine

Multi-jurisdiction quote/invoice generator. Core thesis: tax treatment is a
property of a **jurisdiction profile** (data), never hand-typed prose or
per-quote logic. Totals and labels are *generated* from one calculation
engine — never independently authored — so they can't contradict each other.

## Stack

- `packages/engine` — pure calculation (no I/O). Jurisdiction profiles,
  `calculateQuote()`. Tests: `npm test` (vitest, from repo root or the package).
- `packages/api` — Express + `node:sqlite` (NOT better-sqlite3 — see
  `.claude/state/discoveries.md`). Auth (bcryptjs + JWT cookie + Google ID
  token), multi-tenant (business-scoped), Puppeteer PDF export.
- `packages/web` — React + Vite + Tailwind v4 + shadcn/ui (Base UI
  primitives, not Radix) + framer-motion.

## Commands

- `npm run test` (root) — engine test suite
- `npm run build` (in `packages/web`) — typecheck (`tsc -b`) + vite build;
  run this after any web change, it's the fastest way to catch type errors
- `npx tsc --noEmit` (in `packages/api`) — api typecheck
- `npm run dev` (in `packages/api`, `packages/web` — separate terminals) —
  dev servers on :5187 and :5183

## Conventions

- Every displayed total must be derivable from stored inputs + the active
  jurisdiction profile. Never store a total as authored text.
- Tax labels are generated (`labels.ts`), never free-typed.
- A business is locked to **one** jurisdiction (sets it once in Business
  Settings). Multi-jurisdiction = multiple business profiles per user,
  switchable — not one business quoting in several jurisdictions.
- Quote numbering: sequential, gapless, per-business-per-jurisdiction.
  Jurisdiction is never client-supplied on quote create/edit — always
  derived server-side from the business's locked jurisdiction.
- New jurisdiction = new profile file + two-line registration in the
  `PROFILES` map (api and web) + golden-file tests. Zero engine changes.
  See `.claude/skills/add-jurisdiction/`.

## Security / Git

- Never commit `.env`, the SQLite db, or `data/uploads/`.
- Passwords: bcryptjs only. Sessions: httpOnly JWT cookie, secret in
  `packages/api/data/.session-secret` (gitignored, generated on first run).
- Git repo is initialized, remote `origin` is
  `github.com/YukeshDhakal/Quote-Generator-Test-Model-for-Aus-and-Nep-Market-`,
  branch `main`. Commit and push after every meaningful change — don't let
  work sit local-only across turns.

## How this project's `.claude/` is organized

- `skills/` — reusable **procedures** specific to this project (not generic
  dev-discipline stubs). Load only the one relevant to the current task.
- `state/project-state.md` — current phase/objective/blockers. Read this
  first in a new session, before anything else.
- `state/architecture.md`, `state/decisions.md`, `state/discoveries.md` —
  read only the one relevant to the task at hand, not all three.
- `logs/development-log.md` — compressed one-line-per-milestone history.
  Append after finishing a task; don't read the whole thing unless you need
  history, and even then prefer the tail.
- Tasks live in Claude Code's native task tool, not markdown files.

## Context discipline

Don't read the whole repo or every state file per task. Read
`project-state.md`, then only the specific skill/state file the task needs,
then only the source files in scope. Update state files in place — don't
let them grow into transcripts; they hold current facts, not narration.
