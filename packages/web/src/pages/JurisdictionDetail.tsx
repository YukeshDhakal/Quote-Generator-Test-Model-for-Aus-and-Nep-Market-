import { Link, Navigate, useParams } from 'react-router-dom'
import { AU_PROFILE, NP_PROFILE, calculateQuote, formatAmount, type JurisdictionProfile } from '@quote-engine/engine'
import { MarketingLayout } from '../components/MarketingLayout'
import { getFaqsForJurisdiction } from '../data/jurisdiction-faqs'
import { formatTaxRate, getLiveJurisdictionBySlug } from '../data/jurisdictions'

const PROFILES: Record<string, JurisdictionProfile> = { AU: AU_PROFILE, NP: NP_PROFILE }

const EXAMPLE_DATE: Record<string, string> = {
  AU: '15/08/2026',
  NP: '2083/04/15',
}

export function JurisdictionDetail() {
  const { slug } = useParams<{ slug: string }>()
  const jurisdiction = slug ? getLiveJurisdictionBySlug(slug) : undefined

  if (!jurisdiction) {
    return <Navigate to="/jurisdictions" replace />
  }

  const profile = PROFILES[jurisdiction.code]
  const faqs = getFaqsForJurisdiction(jurisdiction)

  const example = calculateQuote({
    quoteNumber: 'EXAMPLE',
    date: EXAMPLE_DATE[jurisdiction.code],
    documentTypeKey: profile.documentTypes[0].key,
    jurisdictionProfile: profile,
    lineItems: [{ productCode: '', description: 'Example line item', qty: 1, unitPrice: 1234567.89, taxable: true }],
  })

  const otherJurisdiction = jurisdiction.code === 'AU' ? getLiveJurisdictionBySlug('nepal') : getLiveJurisdictionBySlug('australia')

  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[1310px] px-5 py-[76px] pb-24 md:px-14">
        <div className="flex items-center gap-2.5">
          <span className="rounded-[5px] border border-white/15 px-[7px] py-[3px] font-mono text-[11px] tracking-[0.14em]">
            {jurisdiction.code}
          </span>
          <span className="font-mono text-[11px] tracking-[0.14em] text-zinc-500 uppercase">Live</span>
        </div>
        <h1 className="mt-4 max-w-[720px] text-[36px] leading-[1.1] font-semibold tracking-[-0.03em] lg:text-[52px]">
          {jurisdiction.code === 'AU' ? 'GST quote template for Australia' : 'VAT quotation format for Nepal'}
        </h1>
        <p className="mt-5 max-w-[600px] text-[16px] leading-[1.6] text-zinc-400">
          {jurisdiction.tax.label} in {jurisdiction.name} is {formatTaxRate(jurisdiction.tax.rate)}, shown{' '}
          {jurisdiction.tax.basis === 'inclusive' ? 'inside the price' : 'added on top of the price'} — every quote
          you generate for this jurisdiction uses this rate and this presentation automatically.
        </p>

        {/* Facts grid — sourced from data/jurisdictions.json, not hardcoded here */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Fact label="Tax" value={`${jurisdiction.tax.label} ${formatTaxRate(jurisdiction.tax.rate)}`} />
          <Fact label="Basis" value={jurisdiction.tax.basis === 'inclusive' ? 'Inside the price' : 'Added on top'} />
          <Fact
            label="Calendar"
            value={jurisdiction.calendar.system === 'bikram_sambat' ? 'Bikram Sambat' : 'Gregorian'}
          />
          <Fact label="Date format" value={jurisdiction.calendar.format} />
          <Fact
            label="Number format"
            value={jurisdiction.numerals.grouping === 'lakh_crore' ? 'Lakh/crore grouping' : 'Western grouping'}
          />
          <Fact label="Business identifier" value={jurisdiction.identifier.label} />
          <Fact label="Document types" value={jurisdiction.documentTypes.join(', ')} />
          <Fact label="Currency" value={jurisdiction.currency.code} />
        </div>

        {/* Worked example — computed live by the actual calculation engine, not typed by hand */}
        <section className="mt-16">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Worked example</p>
          <div className="mt-5 max-w-[420px] rounded-[14px] bg-white text-zinc-950 shadow-[0_20px_60px_-20px_rgba(0,0,0,.5)]">
            <div className="border-b border-[#e4e4e7] p-5">
              <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                {example.documentType.title}
              </p>
              <p className="mt-2 font-mono text-[11px] text-zinc-400">{EXAMPLE_DATE[jurisdiction.code]}</p>
            </div>
            <div className="flex justify-between px-5 py-4 text-[13.5px] font-medium">
              <span>Example line item</span>
              <span className="tabular-nums">{formatAmount(example.totals.lineSubtotal, profile)}</span>
            </div>
            <div className="m-[8px_16px_16px] rounded-[11px] bg-zinc-950 p-[16px_18px] text-zinc-50">
              <div className="flex justify-between font-mono text-xs text-zinc-400">
                <span>{example.labels.subtotalLabel}</span>
                <span className="tabular-nums text-zinc-200">{formatAmount(example.totals.lineSubtotal, profile)}</span>
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                <span>{example.labels.taxLabel}</span>
                <span className="tabular-nums text-zinc-200">{formatAmount(example.totals.taxAmount, profile)}</span>
              </div>
              <div className="my-3 h-px bg-white/15" />
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">
                  {example.labels.grandTotalLabel}
                </p>
                <p className="text-[24px] font-semibold tracking-[-0.03em] tabular-nums whitespace-nowrap">
                  {formatAmount(example.totals.grandTotal, profile)}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 max-w-[520px] text-[13.5px] leading-[1.6] text-zinc-500">
            Label and figure both come from this one calculation — the number format above (
            {jurisdiction.numerals.grouping === 'lakh_crore' ? 'lakh/crore grouping' : 'western grouping'}) is what
            every quote in {jurisdiction.name} actually renders, not a stylised example.
          </p>
        </section>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section className="mt-16">
            <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Questions</p>
            <div className="mt-5 max-w-[720px] divide-y divide-white/10 border-y border-white/10">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="cursor-pointer list-none text-[15px] font-medium text-zinc-50 marker:content-none">
                    {faq.question}
                  </summary>
                  <p className="mt-2.5 text-[14px] leading-[1.6] text-zinc-400">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Cross-links */}
        <p className="mt-14 max-w-[600px] text-[14.5px] text-zinc-400">
          Read more about{' '}
          <Link to="/what-we-do" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
            how the calculation works
          </Link>
          {otherJurisdiction && (
            <>
              , or compare against{' '}
              <Link
                to={`/jurisdictions/${otherJurisdiction.slug}`}
                className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50"
              >
                {otherJurisdiction.name}'s {otherJurisdiction.tax.label} format
              </Link>
            </>
          )}
          .
        </p>
      </main>
    </MarketingLayout>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">
      <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">{label}</p>
      <p className="mt-2 text-[13.5px] font-medium text-zinc-50">{value}</p>
    </div>
  )
}
