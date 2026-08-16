import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BusinessSettings } from './pages/BusinessSettings'
import { Dashboard } from './pages/Dashboard'
import { EditQuote } from './pages/EditQuote'
import { JurisdictionDetail } from './pages/JurisdictionDetail'
import { JurisdictionsIndex } from './pages/JurisdictionsIndex'
import { LandingPage } from './pages/LandingPage'
import { NewQuote } from './pages/NewQuote'
import { PrivacyPolicy } from './pages/PrivacyPolicy'
import { QuoteDetail } from './pages/QuoteDetail'
import { QuoteList } from './pages/QuoteList'
import { Roadmap } from './pages/Roadmap'
import { TermsOfService } from './pages/TermsOfService'
import { WhatWeDo } from './pages/WhatWeDo'
import { AuthProvider, useAuth } from './lib/auth-context'

function LoadingScreen() {
  return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
}

/** Gates the authenticated app. Public marketing routes never use this — they must render
 * immediately regardless of auth state (including during SSR prerendering, where `loading`
 * never resolves at all since effects don't run server-side). */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** "/" is both the public marketing home page (what crawlers/OAuth verification/social-share
 * bots see) and the entry point that redirects a logged-in user straight to /dashboard. Those
 * two jobs conflict during SSR prerendering: `loading` from useAuth() never resolves server-side
 * (effects don't run there), so without the `hydrated` gate below this would prerender as a bare
 * "Loading…" spinner forever - exactly what Google's OAuth branding review flagged ("home page
 * does not explain the purpose of your app"), and equally bad for real SEO/link-preview crawlers.
 * `hydrated` starts false on both server and the client's first (pre-hydration) render - so they
 * produce identical output (<LandingPage/>) and hydration doesn't mismatch - then flips true via
 * the effect below on the client only, after which real auth state takes over as before. */
function HomeRoute() {
  const { user, loading } = useAuth()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  if (!hydrated) return <LandingPage />
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing pages — accessible regardless of auth state */}
      <Route path="/what-we-do" element={<WhatWeDo />} />
      <Route path="/jurisdictions" element={<JurisdictionsIndex />} />
      <Route path="/jurisdictions/:slug" element={<JurisdictionDetail />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <AuthPage initialMode="login" />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <AuthPage initialMode="signup" />
          </RedirectIfAuthed>
        }
      />

      {/* Authenticated app */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quotes" element={<QuoteList />} />
        <Route path="/quotes/new" element={<NewQuote />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/quotes/:id/edit" element={<EditQuote />} />
        <Route path="/settings" element={<BusinessSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
