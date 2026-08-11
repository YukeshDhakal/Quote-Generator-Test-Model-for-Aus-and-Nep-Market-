import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '../components/Logo'
import { getGoogleConfig, login, loginWithGoogle, signup } from '../api'
import { useAuth } from '../lib/auth-context'

function AnimatedBackground() {
  // Same restrained, monochrome glow language as the landing page hero — just animated.
  const blobs = [
    { className: 'bg-white/[0.08]', size: 480, start: { x: '-15%', y: '-10%' }, end: { x: '10%', y: '15%' }, duration: 20 },
    { className: 'bg-white/[0.06]', size: 420, start: { x: '80%', y: '70%' }, end: { x: '60%', y: '40%' }, duration: 24 },
    { className: 'bg-white/[0.05]', size: 360, start: { x: '70%', y: '-10%' }, end: { x: '50%', y: '10%' }, duration: 28 },
  ]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${blob.className}`}
          style={{ width: blob.size, height: blob.size, left: blob.start.x, top: blob.start.y }}
          animate={{ left: [blob.start.x, blob.end.x, blob.start.x], top: [blob.start.y, blob.end.y, blob.start.y] }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

function useGoogleSignIn(onCredential: (credential: string) => void) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    getGoogleConfig().then(({ configured: isConfigured, clientId }) => {
      if (cancelled || !isConfigured || !clientId) {
        setConfigured(false)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => {
        if (cancelled || !window.google || !buttonRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => onCredential(resp.credential),
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
        })
        setConfigured(true)
      }
      document.head.appendChild(script)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { buttonRef, configured }
}

interface AuthPageProps {
  initialMode?: 'login' | 'signup'
  onBack?: () => void
}

export function AuthPage({ initialMode = 'login', onBack }: AuthPageProps) {
  const { refresh } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [jurisdiction, setJurisdiction] = useState('AU')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { buttonRef, configured } = useGoogleSignIn(async (credential) => {
    setError(null)
    try {
      await loginWithGoogle(credential)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    }
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signup({ email, password, name: name || undefined, businessName: businessName || undefined, jurisdiction })
      } else {
        await login({ email, password })
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <AnimatedBackground />

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <button
            type="button"
            onClick={onBack}
            className={onBack ? 'cursor-pointer' : 'cursor-default'}
            aria-label="Back to home"
          >
            <Logo size={22} />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16">
        <motion.div
          className="w-[380px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="mb-3 text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </p>
          <h1 className="mb-8 text-4xl font-semibold tracking-tight">
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h1>

          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-sm">
            <CardHeader>
              <CardDescription>
                {mode === 'login' ? 'Welcome back to Quote Engine.' : 'Start quoting across jurisdictions.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div ref={buttonRef} className={configured ? 'flex justify-center' : 'hidden'} />
            {configured === false && (
              <p className="text-center text-xs text-muted-foreground">
                Google sign-in isn't configured on this server yet.
              </p>
            )}

            {configured !== null && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    placeholder="Defaults to “Your Name's Business”"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              )}
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select
                    items={{ AU: 'Australia (GST)', NP: 'Nepal (VAT)' }}
                    value={jurisdiction}
                    onValueChange={(v) => v && setJurisdiction(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AU">Australia (GST)</SelectItem>
                      <SelectItem value="NP">Nepal (VAT)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Where this business is registered. Locked once set — you can add more business profiles for
                    other jurisdictions later.
                  </p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
