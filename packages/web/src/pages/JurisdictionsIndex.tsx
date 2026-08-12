import { Link } from 'react-router-dom'
import { MarketingLayout } from '../components/MarketingLayout'
import { formatTaxRate, LIVE_JURISDICTIONS, PLANNED_JURISDICTIONS } from '../data/jurisdictions'

export function JurisdictionsIndex() {
  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[1310px] px-5 py-[76px] pb-24 md:px-14">
        <h1 className="max-w-[720px] text-[40px] leading-[1.1] font-semibold tracking-[-0.035em] lg:text-[56px]">
          Quote templates, built per jurisdiction.
        </h1>
        <p className="mt-6 max-w-[600px] text-[16px] leading-[1.6] text-zinc-400">
          Tax treatment is a property of the jurisdiction, not a setting you configure by hand.
          Each country below has its own rate, calendar, number format, and business identifier —
          picked once per business, correct on every quote after that. Read more about{' '}
          <Link to="/what-we-do" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
            how the calculation works
          </Link>
          .
        </p>

        <section className="mt-16">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Live</p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LIVE_JURISDICTIONS.map((j) => (
              <Link
                key={j.code}
                to={`/jurisdictions/${j.slug}`}
                className="rounded-[14px] border border-white/15 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-[5px] border border-white/15 px-[7px] py-[3px] font-mono text-[11px] tracking-[0.14em]">
                    {j.code}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">{j.name}</span>
                </div>
                <p className="mt-3 font-mono text-[12.5px] text-zinc-400">
                  {j.tax.label} {formatTaxRate(j.tax.rate)} · {j.summary}
                </p>
              </Link>
            ))}
          </div>
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
                <p className="mt-2.5 font-mono text-[10.5px] tracking-[0.1em] text-zinc-600 uppercase">Planned</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[14.5px] text-zinc-400">
            See timing and what's deliberately not planned on the{' '}
            <Link to="/roadmap" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              roadmap
            </Link>
            .
          </p>
        </section>
      </main>
    </MarketingLayout>
  )
}
