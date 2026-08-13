# Project State

Read this file first in any new session. Keep it short — facts, not narration.

## Current phase

Building toward the "full scale" multi-tenant SaaS version (user chose this
early rather than staying single-tenant longer). Quote functionality is
complete; Invoice has not been started. **Live in production** as of
2026-08-12: web on Vercel (quoteengine.dev), API on Fly.io
(api.quoteengine.dev). Onboarding real testers now.

## Current objective

Invoice feature (separate entity from Quote, legally-significant sequential
numbering — see `.claude/state/decisions.md`).

## Production infra (2026-08-12)

- **Web**: Vercel project `quote-generator-test-model-for-aus-and-nep-market-api`
  (misleading name, it's actually the web app — Root Directory
  `packages/web`), aliased to `www.quoteengine.dev` (apex redirects to www).
  `VITE_API_URL=https://api.quoteengine.dev`.
- **API**: Fly.io app `quoteengine`, custom domain `api.quoteengine.dev`
  (same registrable domain as the web app → session cookie is same-site,
  `SameSite=Lax`). `min_machines_running=1`, `auto_stop_machines=off` —
  do NOT re-enable scale-to-zero, it was silently dropping live requests
  (Fly's proxy gives up mid stop/start cycle) and was a real cause of
  intermittent login/signup failures, not just slow cold starts.
  VM: `shared-cpu-1x`, 1GB memory — Chromium/Puppeteer needs the
  headroom, 512MB was not enough (see discoveries.md).
- **Database**: Postgres via Supabase, **not** node:sqlite anymore
  (migrated 2026-08-13, plan at `.claude/plans/mossy-drifting-whale.md`).
  Two projects: `quoteengine-dev` and `quoteengine-prod` (Supabase org
  "YukeshDhakal's Org"). API connects via `pg.Pool` + a `withTransaction`
  helper (`packages/api/src/db.ts`) using `DATABASE_URL` — the **Session
  Pooler** connection string (`aws-0-ap-northeast-2.pooler.supabase.com:5432`),
  not the direct connection (`db.<ref>.supabase.co:5432`), which is
  IPv6-only and unreachable from this dev machine/Fly without the paid
  IPv4 add-on. Schema is tracked at
  `packages/api/supabase/migrations/0001_init_schema.sql` — apply any
  future schema change there and run it via the Supabase SQL Editor on
  both projects, there's no more runtime `CREATE TABLE IF NOT EXISTS`.
  Admin GUI: Supabase Studio (Table Editor + SQL Editor) — this was the
  actual point of the migration, the user wanted ongoing DB visibility.
  Old SQLite file/volume (`quoteengine_data`) is still attached to the
  Fly app, untouched, as a rollback artifact — not read by the app
  anymore, safe to remove after a few weeks of stable Postgres
  operation.
- **Google OAuth**: consent screen published to "In production" (was
  stuck in "Testing", capped at 100 allowlisted test users — blocked
  every other new user with a policy-violation error). Client ID
  `650496659289-...`, project number `650496659289`. Only requests
  non-sensitive scopes (email/profile via ID-token flow), so
  publishing needed no Google review and has no user cap.
- Domain `quoteengine.dev` is registered + DNS-hosted on Vercel
  (`vercel dns` CLI works for record changes, not just the registrar UI).

## Progress (high level)

- [x] Engine: calculation core, AU + NP jurisdiction profiles, 19 golden
      tests, PDF export (Puppeteer)
- [x] Auth: email/password + Google Sign-In, multi-tenant, business-scoped
- [x] Business jurisdiction: locked per business, multi-business-profile
      switching (a business = one jurisdiction; multi-market = multiple
      business profiles under one user) — **live-verified**: create second
      profile, switch, correct per-business isolation and quote numbering.
- [x] Quote CRUD: create, edit, PDF, business settings, branding
- [x] Marketing landing page (dark, bold typography)
- [x] Dashboard: combined "2a Ledger" (hairline stat rail, account dropdown
      in AppShell) + "2b" jurisdiction object card, per user's explicit
      request to merge rather than pick one. **Live-verified**, and found/
      fixed two real bugs in the process (see discoveries.md): a Base UI
      `DropdownMenuLabel`-without-`DropdownMenuGroup` crash (blanked the
      whole page), and `onSelect` vs `onClick` on menu items (compiled
      clean, silently did nothing).
- [x] Responsive line-item table on quote detail — code + compiled-CSS
      verified correct (`display:block`/`none` toggling proven via
      computed styles); could not get a literal narrow-viewport screenshot
      in this environment (`resize_window` doesn't affect this page's
      `window.innerWidth` here — tooling limitation, not an app bug).
- [x] `.claude/` state system (this file and siblings) — built leaner than
      the user's original spec, reusing native Skill/Task tools instead of
      reimplementing them as markdown files.

## Active blockers

None. Production confirmed working end-to-end (login + PDF export) by
the user as of 2026-08-12, and again after the Postgres migration on
2026-08-13 (verified via curl smoke tests + a real-user login-lookup
check against production; not re-verified via the browser).

## Next recommended task

Start Invoice: separate entity from Quote, own numbering scheme that must
satisfy each jurisdiction's legal sequential-numbering requirement (unlike
Quote numbers, which are low-stakes). Reuses the calculation engine and
most of the Quote UI. See project memory (`project_quote_engine_decisions.md`
in the user's memory system, not this repo) for the full build-order
rationale agreed with the user.

Dev servers: `packages/api` on :5187, `packages/web` on :5183 — both get
killed by session/background-task cleanup periodically; check
`Get-NetTCPConnection -LocalPort 5183,5187 -State Listen` before assuming
they're up, restart with `npm run dev` in each package dir if not.
