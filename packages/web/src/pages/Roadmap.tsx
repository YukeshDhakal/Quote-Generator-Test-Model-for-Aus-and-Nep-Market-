import { Link } from 'react-router-dom'
import { MarketingLayout } from '../components/MarketingLayout'
import { LIVE_JURISDICTIONS, PLANNED_JURISDICTIONS, formatTaxRate } from '../data/jurisdictions'

export function Roadmap() {
  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[1310px] px-5 py-[76px] pb-24 md:px-14">
        <h1 className="max-w-[600px] text-[40px] leading-[1.1] font-semibold tracking-[-0.035em] lg:text-[56px]">
          Where we're headed.
        </h1>
        <p className="mt-6 max-w-[600px] text-[16px] leading-[1.6] text-zinc-400">
          We're expanding one verified jurisdiction at a time — prioritising real tax models over
          country count. See the full detail per country on{' '}
          <Link to="/jurisdictions" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
            the jurisdictions page
          </Link>
          .
        </p>

        <section className="mt-16">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Live now</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LIVE_JURISDICTIONS.map((j) => (
              <div key={j.code} className="rounded-[14px] border border-white/15 bg-white/[0.03] p-6">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-[5px] border border-white/15 px-[7px] py-[3px] font-mono text-[11px] tracking-[0.14em]">
                    {j.code}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">{j.name}</span>
                </div>
                <p className="mt-3 font-mono text-[12.5px] text-zinc-400">
                  {j.tax.label} {formatTaxRate(j.tax.rate)} · {j.summary}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-[640px] text-[14.5px] leading-[1.6] text-zinc-400">
            Chosen deliberately: GST and VAT disagree on almost everything a tax model can
            disagree on — whether tax sits inside or outside the price, calendar system, digit
            grouping, required identifiers. The hardest pair we could find to prove the model
            against.
          </p>
        </section>

        <section className="mt-14">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Planned</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANNED_JURISDICTIONS.map((j) => (
              <div key={j.code} className="rounded-[14px] border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-[5px] border border-white/10 px-[7px] py-[3px] font-mono text-[10.5px] tracking-[0.14em] text-zinc-500">
                    {j.code}
                  </span>
                  <span className="text-[15px] font-medium text-zinc-300">{j.name}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-[640px] text-[14.5px] leading-[1.6] text-zinc-400">
            Every jurisdiction-specific rule already lives in a profile record, not application
            code — adding a country is a configuration and test-fixture exercise. No dates are
            committed here yet; each one ships when its tax rules are sourced and verified, not on
            a fixed schedule.
          </p>
        </section>

        <section className="mt-14 border-t border-white/10 pt-14">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            What we're not building
          </p>
          <h2 className="mt-4 max-w-[560px] text-[26px] leading-[1.2] font-semibold tracking-[-0.02em]">
            Quote-to-invoice conversion is not on the roadmap.
          </h2>
          <p className="mt-4 max-w-[600px] text-[15px] leading-[1.6] text-zinc-400">
            This isn't a missing feature — it's a deliberate boundary. Quote Engine generates
            quotes; turning an accepted quote into a tax invoice is a legal and compliance step we
            are choosing to stay outside of, not a capability we haven't gotten to yet. Read more
            about{' '}
            <Link to="/what-we-do" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              what we deliberately don't do
            </Link>
            .
          </p>
        </section>
      </main>
    </MarketingLayout>
  )
}
