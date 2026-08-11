import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getMe, logout as apiLogout, type AuthBusiness, type AuthUser } from '../api'

interface AuthContextValue {
  user: AuthUser | null
  business: AuthBusiness | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [business, setBusiness] = useState<AuthBusiness | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await getMe()
      setUser(me.user)
      setBusiness(me.business)
    } catch {
      setUser(null)
      setBusiness(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
    setBusiness(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, business, loading, refresh, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
