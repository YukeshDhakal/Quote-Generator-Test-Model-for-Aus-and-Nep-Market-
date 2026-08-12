import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '../lib/auth-context'

/**
 * Right-side CTAs for the marketing SiteNav. Defaults to logged-out (Sign in / Start free) while
 * auth is still resolving — correct for prerendered/crawler HTML, which never resolves auth, and
 * for the brief real-client window before the session check completes.
 */
export function MarketingNavCtas() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return (
      <Button
        className="h-auto rounded-lg bg-zinc-50 px-[15px] py-2 text-[13.5px] font-medium text-zinc-950 hover:bg-zinc-200"
        onClick={() => navigate('/dashboard')}
      >
        Go to dashboard
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="ghost"
        className="text-zinc-50 hover:bg-white/10 hover:text-zinc-50"
        onClick={() => navigate('/login')}
      >
        Sign in
      </Button>
      <Button
        className="h-auto rounded-lg bg-zinc-50 px-[15px] py-2 text-[13.5px] font-medium text-zinc-950 hover:bg-zinc-200"
        onClick={() => navigate('/signup')}
      >
        Start free
      </Button>
    </>
  )
}
