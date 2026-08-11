import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppShell, type AppView } from './components/AppShell'
import { AuthPage } from './pages/AuthPage'
import { BusinessSettings } from './pages/BusinessSettings'
import { Dashboard } from './pages/Dashboard'
import { EditQuote } from './pages/EditQuote'
import { LandingPage } from './pages/LandingPage'
import { NewQuote } from './pages/NewQuote'
import { QuoteDetail } from './pages/QuoteDetail'
import { QuoteList } from './pages/QuoteList'
import { AuthProvider, useAuth } from './lib/auth-context'

type PublicView = { name: 'landing' } | { name: 'login' } | { name: 'signup' }

type View =
  | { section: 'dashboard' }
  | { section: 'quotes'; sub: 'list' }
  | { section: 'quotes'; sub: 'new' }
  | { section: 'quotes'; sub: 'detail'; id: string }
  | { section: 'quotes'; sub: 'edit'; id: string }
  | { section: 'settings' }

function initialView(): View {
  // The app has no general router — every other section resets to Dashboard on reload. Quotes
  // is the one screen whose filter state is meant to survive a reload/share (see QuoteList's
  // URL sync), so a `view=quotes` marker in the URL restores that specific screen on load.
  if (new URLSearchParams(window.location.search).get('view') === 'quotes') {
    return { section: 'quotes', sub: 'list' }
  }
  return { section: 'dashboard' }
}

function AppRoot() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<View>(initialView)
  const [refreshKey, setRefreshKey] = useState(0)
  const [publicView, setPublicView] = useState<PublicView>({ name: 'landing' })

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!user) {
    if (publicView.name === 'landing') {
      return (
        <LandingPage
          onSignIn={() => setPublicView({ name: 'login' })}
          onGetStarted={() => setPublicView({ name: 'signup' })}
        />
      )
    }
    return (
      <AuthPage
        initialMode={publicView.name}
        onBack={() => setPublicView({ name: 'landing' })}
      />
    )
  }

  const activeSection: AppView = view.section

  function navigate(section: AppView) {
    if (section === 'quotes') setView({ section: 'quotes', sub: 'list' })
    else setView({ section })
  }

  return (
    <AppShell active={activeSection} onNavigate={navigate}>
      <AnimatePresence mode="wait">
        {view.section === 'dashboard' && (
          <Dashboard
            key="dashboard"
            onNewQuote={() => setView({ section: 'quotes', sub: 'new' })}
            onSelectQuote={(id) => setView({ section: 'quotes', sub: 'detail', id })}
            onGoToQuotes={() => setView({ section: 'quotes', sub: 'list' })}
            onGoToSettings={() => setView({ section: 'settings' })}
          />
        )}
        {view.section === 'quotes' && view.sub === 'list' && (
          <QuoteList
            key="quotes-list"
            refreshKey={refreshKey}
            onSelect={(id) => setView({ section: 'quotes', sub: 'detail', id })}
            onNew={() => setView({ section: 'quotes', sub: 'new' })}
          />
        )}
        {view.section === 'quotes' && view.sub === 'new' && (
          <NewQuote
            key="quotes-new"
            onCreated={(id) => {
              setRefreshKey((k) => k + 1)
              setView({ section: 'quotes', sub: 'detail', id })
            }}
            onGoToSettings={() => setView({ section: 'settings' })}
          />
        )}
        {view.section === 'quotes' && view.sub === 'detail' && (
          <QuoteDetail
            key={view.id}
            quoteId={view.id}
            onBack={() => setView({ section: 'quotes', sub: 'list' })}
            onEdit={(id) => setView({ section: 'quotes', sub: 'edit', id })}
          />
        )}
        {view.section === 'quotes' && view.sub === 'edit' && (
          <EditQuote
            key={`edit-${view.id}`}
            quoteId={view.id}
            onSaved={(id) => {
              setRefreshKey((k) => k + 1)
              setView({ section: 'quotes', sub: 'detail', id })
            }}
          />
        )}
        {view.section === 'settings' && <BusinessSettings key="settings" />}
      </AnimatePresence>
    </AppShell>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  )
}

export default App
