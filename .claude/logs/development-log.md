# Development Log

One line per completed milestone. Append, don't rewrite. Read the tail
unless you need history.

- 2026-08-10 — Engine scaffolded: domain model, AU/NP profiles, calculation
  engine (step-registry driven), 19 golden tests vs real AUQU0085/AUQU0086/
  R.K.Trading documents. All passing.
- 2026-08-10 — React+Vite+framer-motion web app scaffolded, engine wired in
  via workspace link, verified in browser.
- 2026-08-10 — Backend added: Express + `node:sqlite` (better-sqlite3
  failed, no native toolchain — see discoveries.md), Quote CRUD, PDF
  export via Puppeteer, business branding settings.
- 2026-08-10/11 — Full auth + multi-tenancy pivot: users/businesses tables,
  bcryptjs + JWT sessions, Google Sign-In, every table business-scoped,
  cross-tenant isolation verified (404 on direct-ID access, not just list
  filtering).
- 2026-08-11 — Tailwind v4 + shadcn/ui (Base UI) frontend rebuild: login/
  signup, sidebar app shell, dashboard, all pages re-skinned. Fixed shadcn
  CLI monorepo alias bug (see decisions.md).
- 2026-08-11 — Marketing landing page (dark, bold typography, inspired by
  nudot.com.tw reference but simplified per "as minimalistic as possible").
  Auth pages restyled to match (same dark theme, animated glow background).
- 2026-08-11 — Google Client ID configured and wired end-to-end (button
  renders; full OAuth click-through not yet tested — that's the user's own
  Google account).
- 2026-08-11 — Edit Quote feature added (PUT endpoints, jurisdiction locked
  post-creation, shared `QuoteForm` component). Found and fixed a real bug
  via the user's own testing: percent-discount unit mismatch causing a
  negative total (see decisions.md).
- 2026-08-11 — Business jurisdiction lock + multi-business-profile
  switching, per user's "a business is registered in one place" framing.
  Jurisdiction removed from client-supplied quote-create payload entirely.
- 2026-08-11 — Dashboard rewritten per Claude Design canvas import: first
  attempt was "2b Jurisdiction-first," user redirected to "2a Ledger"
  (hairline stat rail + inverted jurisdiction band + account dropdown in
  AppShell). Responsive line-item table (1e) added to quote detail.
  Code complete, browser re-verification pending as of this entry.
- 2026-08-11 — `.claude/` state system created (this file, skills/,
  state/, CLAUDE.md) — leaner than the user's original spec, reusing
  native Claude Code skills/tasks instead of reimplementing them as files.
- 2026-08-11 — Dashboard: user redirected from "2a only" to "combine 2a +
  2b content on one page" mid-build; merged hairline stat rail + account
  dropdown (2a) with the richer per-jurisdiction object card (2b). Live
  browser verification found and fixed two real Base UI bugs (see
  discoveries.md: DropdownMenuLabel/Group crash, onSelect vs onClick).
  Business-profile create+switch flow confirmed working via the user's own
  parallel testing (they created a second "Aussie Trading" AU profile
  independently). Full regression (19 engine tests + both typechecks)
  green at end of session.
- 2026-08-12 — Production went live (Vercel + Fly.io + quoteengine.dev)
  and a batch of real deployment bugs surfaced from actual tester
  traffic: broken logout, third-party-cookie login failures (fixed by
  migrating the API to api.quoteengine.dev, same-site with the web
  app), PDF export failing four different ways in the container
  (sandbox, /dev/shm, single-process, memory — see discoveries.md),
  Fly scale-to-zero silently dropping live requests, and the Google
  OAuth consent screen stuck in Testing (100-user cap, blocked every
  non-test-user). All fixed and confirmed working end-to-end by the
  user. Two other concurrent sessions/agents were independently fixing
  the same PDF bug via GitHub PRs during this session — reconciled via
  rebase each time rather than duplicating the work.
- 2026-08-13 — Migrated the database from node:sqlite to Postgres
  (Supabase), so the user has an ongoing admin GUI (Table Editor + SQL
  Editor) instead of needing to download the SQLite file to look at
  data. Full rewrite of db.ts/auth.ts/business.ts/numbering.ts/server.ts
  (~50 call sites, plan at .claude/plans/mossy-drifting-whale.md),
  including a real fix found during the rewrite (Express 4.x has no
  async-rejection handling — added express-async-errors + error
  middleware) and a numbering improvement (quote-number allocation now
  shares a transaction with quote creation, closing a narrow gap-in-
  sequence bug). Verified end-to-end against quoteengine-dev via a full
  manual smoke test, then live production data (9 users, 10 businesses,
  6 quotes) migrated to quoteengine-prod with a maintenance window
  (~2 minutes), row-count-verified, and confirmed working via a
  production API check before scaling back up.
