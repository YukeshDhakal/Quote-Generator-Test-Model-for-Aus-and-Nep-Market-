import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
}

/**
 * Placeholder brand mark for Quote Engine itself (distinct from a business's own logo,
 * which lives in Business Settings and appears on their quotes/PDFs). Swap the <svg> below
 * for a real logo file whenever one exists — every call site already points here.
 */
export function Logo({ size = 28, showWordmark = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <path
          d="M10 12.5C10 10.567 11.567 9 13.5 9H14.5V13.5H12V16.5C12 17.6 12.9 18.5 14 18.5H14.5V22H13.5C11.567 22 10 20.433 10 18.5V12.5Z"
          className="fill-primary-foreground"
        />
        <path
          d="M18 12.5C18 10.567 19.567 9 21.5 9H22.5V13.5H20V16.5C20 17.6 20.9 18.5 22 18.5H22.5V22H21.5C19.567 22 18 20.433 18 18.5V12.5Z"
          className="fill-primary-foreground"
        />
      </svg>
      {showWordmark && <span className="text-lg font-semibold tracking-tight">Quote Engine</span>}
    </div>
  )
}
