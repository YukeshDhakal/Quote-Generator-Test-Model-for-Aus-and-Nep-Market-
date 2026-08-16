import { getFaqsForJurisdiction } from './jurisdiction-faqs'
import { formatTaxRate, LIVE_JURISDICTIONS, type LiveJurisdiction } from './jurisdictions'

/**
 * No real domain has been decided yet — set SITE_URL once one exists (env var at build time).
 * Falls back to a clearly-placeholder value so canonical/OG URLs are never silently wrong.
 */
export const SITE_URL = (import.meta.env?.VITE_SITE_URL as string | undefined) || 'https://quoteengine.example'

export interface RouteSeo {
  path: string
  title: string
  description: string
  jsonLd?: Record<string, unknown>
}

function faqJsonLd(j: LiveJurisdiction): Record<string, unknown> {
  const faqs = getFaqsForJurisdiction(j)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

const SOFTWARE_APPLICATION_JSON_LD: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Quote Engine',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Quotation template generator with jurisdiction-correct GST/VAT calculation for Australia and Nepal, with more countries planned.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

const STATIC_ROUTES: RouteSeo[] = [
  {
    path: '/',
    title: 'Quote Engine — Quotes Computed, Never Typed',
    description:
      'Generate branded GST or VAT quotation templates where the tax label and the total always agree. Australia and Nepal live today.',
  },
  {
    path: '/what-we-do',
    title: 'Quotation Templates & Quote Generator | Quote Engine',
    description:
      'Create GST or VAT quotation templates with correct tax math every time. Branded PDF quotes for Australia and Nepal — no invoicing required.',
    jsonLd: SOFTWARE_APPLICATION_JSON_LD,
  },
  {
    path: '/jurisdictions',
    title: 'GST & VAT Quote Templates by Country | Quote Engine',
    description:
      'Jurisdiction-specific quote templates for Australia (GST) and Nepal (VAT), with more countries planned. See tax rate, format, and date rules per country.',
  },
  {
    path: '/roadmap',
    title: 'Roadmap | Quote Engine',
    description:
      "What's live, what's planned, and what's deliberately not on the roadmap for Quote Engine's multi-jurisdiction quote templates.",
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Quote Engine',
    description: 'How Quote Engine collects, stores, and uses your data, including Gmail gmail.send access.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | Quote Engine',
    description: 'The terms that apply to using Quote Engine to generate and send quotation documents.',
  },
]

const JURISDICTION_ROUTES: RouteSeo[] = LIVE_JURISDICTIONS.map((j) => {
  if (j.code === 'AU') {
    return {
      path: `/jurisdictions/${j.slug}`,
      title: 'GST Quote Template for Australia | Quote Engine',
      description: `Generate GST-compliant quote templates for Australia — ${formatTaxRate(j.tax.rate)} GST shown inside the price, Gregorian dates, ABN on every quote. Try it free.`,
      jsonLd: faqJsonLd(j),
    }
  }
  return {
    path: `/jurisdictions/${j.slug}`,
    title: 'VAT Quotation Format for Nepal | Quote Engine',
    description: `Generate VAT quotation formats for Nepal — ${formatTaxRate(j.tax.rate)} VAT added on top, Bikram Sambat dates, lakh/crore number grouping, PAN on every quote.`,
    jsonLd: faqJsonLd(j),
  }
})

export function getAllSeoRoutes(): RouteSeo[] {
  return [...STATIC_ROUTES, ...JURISDICTION_ROUTES]
}

export function getRouteSeo(pathname: string): RouteSeo | undefined {
  return getAllSeoRoutes().find((r) => r.path === pathname)
}
