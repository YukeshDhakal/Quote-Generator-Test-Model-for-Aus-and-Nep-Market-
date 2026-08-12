import { Link } from 'react-router-dom'
import { Logo } from './Logo'

// Real, routed pages use react-router's <Link>. Privacy/Contact have no destination yet — a
// react-router <Link to="#"> resolves "#" relative to the current route (landing on whatever
// page you're already on, not a harmless same-page anchor), so those stay plain <a> tags.
const ROUTED_LINKS = [
  { label: 'What We Do', href: '/what-we-do' },
  { label: 'Jurisdictions', href: '/jurisdictions' },
  { label: 'Roadmap', href: '/roadmap' },
]
const PLACEHOLDER_LINKS = [
  { label: 'Privacy', href: '#' },
  { label: 'Contact', href: '#' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-[1310px] px-5 py-[26px] md:px-14">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={18} showWordmark={false} className="[&_path]:fill-zinc-400 [&_rect]:fill-zinc-800" />
            <span className="font-mono text-xs text-zinc-600">&copy; {new Date().getFullYear()} Quote Engine</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-[26px] gap-y-2 font-mono text-xs text-zinc-500">
            {ROUTED_LINKS.map((link) => (
              <Link key={link.label} to={link.href} className="hover:text-zinc-300">
                {link.label}
              </Link>
            ))}
            {PLACEHOLDER_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-zinc-300">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <p className="mt-5 border-t border-white/10 pt-5 text-center font-mono text-[11px] text-zinc-600 sm:text-left">
          Quote Engine generates quotes — not tax invoices.
        </p>
      </div>
    </footer>
  )
}
