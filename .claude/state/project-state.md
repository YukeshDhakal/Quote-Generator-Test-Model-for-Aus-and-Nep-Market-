# Project State

Read this file first in any new session. Keep it short — facts, not narration.

## Current phase

Building toward the "full scale" multi-tenant SaaS version (user chose this
early rather than staying single-tenant longer). Quote functionality is
complete; Invoice has not been started.

## Current objective

Invoice feature (separate entity from Quote, legally-significant sequential
numbering — see `.claude/state/decisions.md`).

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

None.

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
