import raw from './jurisdictions.json'

export interface LiveJurisdiction {
  code: string
  slug: string
  name: string
  status: 'live'
  currency: { code: string; symbol: string }
  tax: { label: string; rate: number; basis: 'inclusive' | 'exclusive' }
  calendar: { system: 'gregorian' | 'bikram_sambat'; format: string }
  numerals: { grouping: 'western' | 'lakh_crore' }
  identifier: { key: string; label: string }
  documentTypes: string[]
  summary: string
}

export interface PlannedJurisdiction {
  code: string
  slug: string
  name: string
  status: 'planned'
}

const data = raw as { live: LiveJurisdiction[]; planned: PlannedJurisdiction[] }

export const LIVE_JURISDICTIONS: LiveJurisdiction[] = data.live
export const PLANNED_JURISDICTIONS: PlannedJurisdiction[] = data.planned

export function getLiveJurisdictionBySlug(slug: string): LiveJurisdiction | undefined {
  return LIVE_JURISDICTIONS.find((j) => j.slug === slug)
}

export function formatTaxRate(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`
}
