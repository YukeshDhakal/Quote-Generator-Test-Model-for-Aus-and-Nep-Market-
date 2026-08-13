# Discoveries

Reusable technical findings. Summarized, not raw research dumps.

- **PowerShell + Invoke-WebRequest**: default IE-parsing engine errors in
  non-interactive shells ("Read and Prompt functionality is not
  available"). Always pass `-UseBasicParsing`.
- **PowerShell**: `$env:Path` and other env var assignments do NOT persist
  between separate tool-call invocations in this environment (each call is
  effectively a fresh process). Re-set `$env:Path` from Machine+User scope
  at the start of every command that needs `node`/`npm` on PATH.
- **`generic Object spread merge gotcha`**: `{...current, ...patch}` in
  `saveBusinessSettings` — if `patch` has a key explicitly set to
  `undefined` (not just absent), it still overwrites `current`'s value.
  Any optional-patch-field API route must conditionally omit the key
  entirely, not set it to `undefined`/`null` as a "no-op" — this caused a
  near-miss bug where saving business branding would have silently wiped
  the jurisdiction field.
- **Base UI `Select`** (this project's shadcn flavor): `SelectValue`
  renders the raw stored value, not the matching `SelectItem`'s label,
  unless `Select` (the root) is given an `items={{value: label}}` prop.
  Easy to miss — it still "works," just displays "AU" instead of
  "Australia (GST)".
- **`request()` helper in `web/src/api.ts`**: calling `res.json()`
  unconditionally throws `SyntaxError: Unexpected end of JSON input` on a
  204 No Content response (e.g. logout). The server-side effect (cookie
  clear) still happened — only the client-side UI update silently failed.
  Fixed by special-casing `status === 204`. Any new no-body endpoint needs
  to return 204, and the client helper already handles it now.
- **Google Sign-In**: the modern Identity Services credential flow needs
  only a Client ID (no client secret) — verified server-side via
  `google-auth-library`'s `verifyIdToken`. Simpler than the OAuth code
  flow; don't add a client-secret env var for this.
- **Base UI `DropdownMenuItem`/`MenuItem`**: uses `onClick`, not Radix's
  `onSelect`. Passing `onSelect` compiles cleanly with no type error (it's
  a real but unrelated HTML DOM prop — text-selection events) and silently
  does nothing at runtime. Also: `DropdownMenuLabel` (renders
  `Menu.GroupLabel`) throws `MenuGroupContext is missing` and blanks the
  whole page unless wrapped in `<DropdownMenuGroup>` — always pair them.
- **Rounding correctness (V-5)**: `rounding.applyAt: 'line'` vs `'total'`
  produce genuinely different totals on the same inputs when line prices
  don't divide evenly (e.g. 7 × 10.005 → 70.07 line-rounded vs 70.04
  total-rounded). Always test both modes explicitly, don't assume they
  converge.
- **Cross-domain cookies + Fly scale-to-zero (2026-08-12 production
  incident)**: three compounding causes behind "testers can't log in":
  (1) web (Vercel) and API (`quoteengine.fly.dev`) were on different
  top-level domains → session cookie was third-party, blocked by Safari
  ITP/Brave/Chrome's rollout regardless of correct `SameSite=None;
  Secure`. Fixed by moving the API to `api.quoteengine.dev` (same
  registrable domain as the web app) and switching to `SameSite=Lax`.
  (2) `res.clearCookie(name)` without echoing the original
  `secure`/`sameSite` options doesn't actually clear a
  `Secure`/`SameSite=None` cookie — browsers won't let a
  non-Secure `Set-Cookie` overwrite a Secure one ("leave secure cookies
  alone"). `clearCookie` needs the same attributes as the original
  `res.cookie` call (minus `maxAge`, or Express recomputes `expires` 30
  days out instead of clearing). (3) `auto_stop_machines=stop` +
  `min_machines_running=0` was letting Fly's proxy give up on requests
  mid stop/start transition (`"failed to connect to machine: gave up
  after 15 attempts"`) — a straight 502 to whoever's request landed at
  the wrong moment, affecting *any* endpoint, not just slow ones. Fixed
  by keeping one machine always running.
- **Puppeteer/Chromium in a Fly.io container** (production PDF export,
  same incident): needed FOUR stacked fixes before it was reliable, in
  order of what surfaces first: `--no-sandbox --disable-setuid-sandbox`
  (container runs as root, no `USER` in Dockerfile), `--disable-dev-shm-usage`
  (Docker's default 64MB `/dev/shm` is too small, causes a hang rather
  than a crash), `--single-process --no-zygote` (avoids Chromium's
  renderer/GPU/zygote process tree — needed under ~1GB memory), and
  bumping the Fly VM from 512MB to 1GB (confirmed via `free -m` over
  `flyctl ssh console`: ~9MB free at idle on 512MB before Chromium even
  starts). Any one fix alone still failed, either immediately or with a
  30s timeout.
- **`tsx` as a runtime dependency, not a devDependency**: this project
  runs its TypeScript server directly via `npx tsx` in production (no
  build step). The Dockerfile sets `NODE_ENV=production` *before*
  `npm ci`, which skips `devDependencies` — so `tsx` silently wasn't in
  the built image, and every cold boot fell through to `npx` fetching
  it fresh from the registry (`npm warn exec ... will be installed`),
  adding real latency to every restart. Since `tsx` is the actual
  runtime interpreter here (not a dev tool), it belongs in
  `dependencies`.
- **Vercel CLI in an npm-workspaces monorepo**: `vercel link` and
  `vercel deploy` must be run from the *same* directory — link from the
  monorepo root (not the subpackage), even though the project's Root
  Directory setting is `packages/web`. Linking from inside
  `packages/web` and then deploying from there double-applies the Root
  Directory (looks for `packages/web/packages/web`, fails with
  "Root Directory does not exist"). Also: `npx vercel <cmd>` run from
  a fresh shell in this environment doesn't reliably inherit `cd` from
  a prior tool call — always `cd` explicitly in the same command.
- **Supabase direct connection is IPv6-only** by default (`db.<ref>.supabase.co:5432`
  resolves to an AAAA record only, no A record) unless the project has
  the paid IPv4 add-on. Fails as `getaddrinfo ENOTFOUND` from networks/
  machines without working IPv6 (this dev machine, confirmed). Fix:
  use the **Session Pooler** connection string instead
  (`aws-0-<region>.pooler.supabase.com:5432`, user becomes
  `postgres.<project-ref>`) — still session-mode (not the 6543
  transaction pooler), so multi-statement transactions still work, and
  it's IPv4-compatible.
- **`fly scale count 0` destroys the machine, it doesn't just stop it**
  (contrary to what "start of a maintenance window" suggests). The
  attached volume survives (volumes are independent of machines in
  Fly's model) and gets reattached to a fresh machine on `scale count
  1`, but don't assume `count 0` is a quick-resume pause — budget for a
  full machine recreate + boot on the way back up.
- **`node:sqlite`'s `DatabaseSync` has no CLI equivalent needed for a
  WAL checkpoint** — if `sqlite3` isn't installed in the container
  (it wasn't here), run the checkpoint via Node directly instead:
  `node -e "const {DatabaseSync}=require('node:sqlite'); const
  db=new DatabaseSync('path/to.db'); db.exec('PRAGMA
  wal_checkpoint(TRUNCATE)'); db.close();"` — folds the `-wal` file
  into the main `.db` file so a subsequent plain file copy is a
  complete, self-consistent snapshot.
- **Git Bash mangles absolute Unix remote paths** in commands like
  `flyctl ssh sftp get /app/data/foo.db ./local.db` — MSYS path
  conversion rewrites `/app/...` as if it were a local Windows path
  (`C:/Program Files/Git/app/...`), producing a "file does not exist"
  error for a path that's actually correct on the remote host. Fix:
  prefix the command with `MSYS_NO_PATHCONV=1`.
