import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { JurisdictionDetail } from './pages/JurisdictionDetail'
import { JurisdictionsIndex } from './pages/JurisdictionsIndex'
import { LandingPage } from './pages/LandingPage'
import { Roadmap } from './pages/Roadmap'
import { WhatWeDo } from './pages/WhatWeDo'
import { AuthProvider, useAuth } from './lib/auth-context'

// Code-split: none of these are reachable from an anonymous landing-page visit, and none are
// part of SSR prerendering (only the public marketing/jurisdiction routes above are prerendered
// via scripts/prerender.mjs), so lazy-loading them keeps the initial bundle to just what the
// site's primary LCP target - the public landing page - actually needs.
const AppShell = lazy(() => import('./components/AppShell').then((m) => ({ default: m.AppShell })))
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })))
const BusinessSettings = lazy(() => import('./pages/BusinessSettings').then((m) => ({ default: m.BusinessSettings })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const EditQuote = lazy(() => import('./pages/EditQuote').then((m) => ({ default: m.EditQuote })))
const NewQuote = lazy(() => import('./pages/NewQuote').then((m) => ({ default: m.NewQuote })))
const QuoteDetail = lazy(() => import('./pages/QuoteDetail').then((m) => ({ default: m.QuoteDetail })))
const QuoteList = lazy(() => import('./pages/QuoteList').then((m) => ({ default: m.QuoteList })))

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

/** Unlike RequireAuth/RedirectIfAuthed, this must NOT gate on `loading` — the landing page
 * is the site's primary LCP target and has to paint immediately for anonymous visitors, who
 * are the common case. `user` stays null until the auth check resolves, so a logged-in visitor
 * briefly sees the landing page before being redirected to /dashboard - an acceptable tradeoff
 * for not blocking every anonymous pageview on an auth round-trip. */
function HomeRoute() {
  const { user } = useAuth()
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

      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Suspense fallback={<LoadingScreen />}>
              <AuthPage initialMode="login" />
            </Suspense>
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <Suspense fallback={<LoadingScreen />}>
              <AuthPage initialMode="signup" />
            </Suspense>
          </RedirectIfAuthed>
        }
      />

      {/* Authenticated app */}
      <Route
        element={
          <RequireAuth>
            <Suspense fallback={<LoadingScreen />}>
              <AppShell />
            </Suspense>
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
