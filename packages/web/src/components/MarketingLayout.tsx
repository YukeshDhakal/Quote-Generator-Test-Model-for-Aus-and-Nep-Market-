import type { ReactNode } from 'react'
import { SiteNav } from './SiteNav'
import { SiteFooter } from './SiteFooter'
import { MarketingNavCtas } from './MarketingNavCtas'
import { useSeoHead } from '../lib/useSeoHead'

export function MarketingLayout({ children }: { children: ReactNode }) {
  useSeoHead()

  return (
    // overflow-clip on both axes, not just x: the ambient glow below is a fixed 1200px tall
    // absolutely-positioned decoration, and on any page shorter than that (e.g. /jurisdictions)
    // its height was leaking into the page's own scrollable area — visible as blank space below
    // the footer — even though "position: absolute" keeps it out of normal layout flow. "clip"
    // still avoids the position:sticky-breaking issue overflow-hidden caused (see LandingPage
    // history), unlike overflow-y-auto/hidden which would reintroduce it.
    <div className="relative min-h-screen overflow-clip bg-zinc-950 text-zinc-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1200px] opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(700px circle at 12% 8%, rgba(255,255,255,.07), transparent 62%), radial-gradient(560px circle at 78% 46%, rgba(255,255,255,.05), transparent 60%)',
        }}
      />
      <SiteNav variant="marketing" right={<MarketingNavCtas />} />
      {children}
      <SiteFooter />
    </div>
  )
}
