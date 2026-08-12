import { useState, type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Logo } from './Logo'

const NAV_LINKS = [
  { label: 'What We Do', href: '/what-we-do' },
  { label: 'Jurisdictions', href: '/jurisdictions' },
  { label: 'Roadmap', href: '/roadmap' },
]

interface SiteNavProps {
  /** 'marketing' = the dark-only public site chrome. 'app' = follows the app's light/dark theme,
   * for use inside AppShell alongside the existing sidebar + account dropdown. */
  variant?: 'marketing' | 'app'
  /** Right-side slot — auth-aware CTAs on marketing pages, the account dropdown inside the app. */
  right: ReactNode
  /** Left-side slot rendered before the logo — e.g. AppShell's sidebar trigger. */
  leftSlot?: ReactNode
  showLogo?: boolean
}

export function SiteNav({ variant = 'marketing', right, leftSlot, showLogo = true }: SiteNavProps) {
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isMarketing = variant === 'marketing'

  function isActive(href: string) {
    return location.pathname === href || location.pathname.startsWith(`${href}/`)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b backdrop-blur-sm',
        isMarketing ? 'border-white/10 bg-zinc-950/80' : 'border-border bg-background/80',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1310px] items-center px-5 md:px-14">
        <div className="flex items-center gap-3">
          {leftSlot}
          {showLogo && (
            <Link to="/">
              <Logo size={22} className={isMarketing ? 'text-zinc-50 [&_span]:text-zinc-50' : undefined} />
            </Link>
          )}
        </div>

        <nav
          className={cn(
            'ml-8 items-center gap-8 text-[13.5px]',
            isMarketing ? 'hidden sm:flex text-zinc-400' : 'hidden md:flex text-muted-foreground',
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'transition-colors',
                isMarketing
                  ? isActive(link.href)
                    ? 'text-zinc-50'
                    : 'hover:text-zinc-50'
                  : isActive(link.href)
                    ? 'text-foreground'
                    : 'hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {right}
          {isMarketing && (
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-50 hover:bg-white/10 hover:text-zinc-50 sm:hidden"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <SheetContent side="right" className="bg-zinc-950 text-zinc-50">
                <SheetHeader>
                  <SheetTitle className="text-zinc-50">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        'rounded-lg px-3 py-2.5 text-[15px]',
                        isActive(link.href) ? 'bg-white/10 text-zinc-50' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-50',
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  )
}
