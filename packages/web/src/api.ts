import type { Discount, DocumentTypeDef, JurisdictionProfile, LineItem, QuoteResult } from '@quote-engine/engine'

export const API_ORIGIN = (import.meta.env?.VITE_API_URL as string | undefined) || 'http://localhost:5187'
const API_BASE = `${API_ORIGIN}/api`

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request to ${path} failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface RequestRecord {
  id: string
  customerName: string
  companyName: string | null
  deliveryAddress: string | null
  billingAddress: string | null
  createdAt: string
  quoteCount: number
}

export interface QuoteSummary {
  id: string
  quoteNumber: string
  customerName: string
  companyName: string | null
  jurisdiction: string
  documentTypeKey: string
  documentTypeTitle: string
  date: string
  grandTotal: number
}

export interface QuoteDetail {
  quoteRow: { id: string; quote_number: string; request_id: string }
  quote: {
    quoteNumber: string
    date: string
    documentTypeKey: string
    lineItems: LineItem[]
    orderDiscount?: Discount
    delivery?: { mode: 'flat' | 'per_quantity'; amount: number }
    jurisdictionProfile: JurisdictionProfile
  }
  result: QuoteResult
  customer: {
    customerName: string
    companyName: string | null
    deliveryAddress: string | null
    billingAddress: string | null
  } | null
}

export function createRequest(input: {
  customerName: string
  companyName?: string
  deliveryAddress?: string
  billingAddress?: string
}) {
  return request<{ id: string }>('/requests', { method: 'POST', body: JSON.stringify(input) })
}

export function updateRequest(
  id: string,
  input: { customerName: string; companyName?: string; deliveryAddress?: string; billingAddress?: string },
) {
  return request<{ id: string }>(`/requests/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function listRequests() {
  return request<RequestRecord[]>('/requests')
}

export function createQuote(
  requestId: string,
  input: {
    documentTypeKey: string
    date: string
    splitValue?: string
    lineItems: LineItem[]
    orderDiscount?: Discount
    delivery?: { mode: 'flat' | 'per_quantity'; amount: number }
  },
) {
  return request<QuoteDetail>(`/requests/${requestId}/quotes`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateQuote(
  id: string,
  input: {
    documentTypeKey: string
    date: string
    splitValue?: string
    lineItems: LineItem[]
    orderDiscount?: Discount
    delivery?: { mode: 'flat' | 'per_quantity'; amount: number }
  },
) {
  return request<QuoteDetail>(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function listQuotes(search?: string, from?: string | null, to?: string | null) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString()
  return request<QuoteSummary[]>(`/quotes${qs ? `?${qs}` : ''}`)
}

export function getQuote(id: string) {
  return request<QuoteDetail>(`/quotes/${id}`)
}

export interface BusinessSettings {
  jurisdiction: string | null
  legalName: string | null
  logoPath: string | null
  color: string | null
  termsText: string | null
  identifiers: Record<string, string>
}

export function getBusiness() {
  return request<BusinessSettings>('/business')
}

export function saveBusiness(input: {
  jurisdiction?: string | null
  legalName?: string | null
  color?: string | null
  termsText?: string | null
  identifiers?: Record<string, string>
}) {
  return request<BusinessSettings>('/business', { method: 'PUT', body: JSON.stringify(input) })
}

export async function uploadLogo(file: File): Promise<BusinessSettings & { logoUrl: string }> {
  const form = new FormData()
  form.append('logo', file)
  const res = await fetch(`${API_BASE}/business/logo`, { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Logo upload failed (${res.status})`)
  }
  return res.json()
}

export function quotePdfUrl(id: string) {
  return `${API_BASE}/quotes/${id}/pdf`
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

export interface AuthBusiness {
  id: string
  name: string
}

export interface AuthResponse {
  user: AuthUser
  business: AuthBusiness
}

export function signup(input: {
  email: string
  password: string
  name?: string
  businessName?: string
  jurisdiction?: string
}) {
  return request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(input) })
}

export interface BusinessProfile {
  id: string
  name: string
  jurisdiction: string | null
  active: boolean
}

export function listBusinesses() {
  return request<BusinessProfile[]>('/auth/businesses')
}

export function createBusinessProfile(input: { name: string; jurisdiction: string }) {
  return request<{ id: string; name: string }>('/auth/businesses', { method: 'POST', body: JSON.stringify(input) })
}

export function switchBusiness(businessId: string) {
  return request<{ business: AuthBusiness }>('/auth/switch-business', {
    method: 'POST',
    body: JSON.stringify({ businessId }),
  })
}

export function login(input: { email: string; password: string }) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export function loginWithGoogle(credential: string) {
  return request<AuthResponse>('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) })
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' })
}

export function getMe() {
  return request<AuthResponse>('/auth/me')
}

export function getGoogleConfig() {
  return request<{ configured: boolean; clientId: string | null }>('/auth/google/config')
}

export interface DashboardData {
  quoteCount: number
  recentQuotes: {
    id: string
    quoteNumber: string
    customerName: string
    jurisdiction: string
    documentTypeTitle: string
    date: string
    grandTotal: number
  }[]
  totalsByJurisdiction: { jurisdiction: string; quoteCount: number; grandTotal: number; taxTotal: number; subtotal: number }[]
  businessJurisdiction: string | null
  nextNumber: string | null
}

export function getDashboard() {
  return request<DashboardData>('/dashboard')
}

export type { DocumentTypeDef }
