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
