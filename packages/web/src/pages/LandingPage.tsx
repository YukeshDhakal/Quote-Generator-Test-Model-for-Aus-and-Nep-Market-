import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo } from '../components/Logo'
import { useCurveReveal } from '../lib/use-curve-reveal'

interface LandingPageProps {
  onSignIn: () => void
  onGetStarted: () => void
}

const NAV_LINKS = [
  { label: 'What we do', href: '#problem' },
  { label: 'Jurisdictions', href: '#jurisdictions' },
  { label: 'Roadmap', href: '#' },
]

const RATE_STRIP = [
  { label: 'Australia', value: 'GST 10% · inside the price' },
  { label: 'Nepal', value: 'VAT 13% · added on top' },
  { label: 'Calendars', value: 'Gregorian · Bikram Sambat' },
  { label: 'Numbering', value: 'Legally sequential' },
]

const CAPABILITIES = [
  {
    title: 'Configuration, not code',
    body: 'A new jurisdiction is a rate table, a calendar and a numbering rule — not a release.',
  },
  {
    title: 'Sequential by law',
    body: 'Quote numbers are issued in order and never reused, so an audit reads clean.',
  },
  {
    title: 'One list, many outputs',
    body: "Enter the work once; export the document each market's regulator expects.",
  },
]

const AU_LINE_ITEMS = [
  { description: 'Palletised freight — SYD→BNE', qty: '14', amount: '5,880.00' },
  { description: 'Cold-chain surcharge', qty: '14', amount: '1,190.00' },
  { description: 'Loading dock labour', qty: '18', amount: '1,728.00' },
  { description: 'Customs documentation', tag: 'GST-free', qty: '1', amount: '3,682.00' },
]

const PROOF_LINE_ITEMS = [
  { description: 'Palletised freight — SYD→BNE', amount: '5,880.00' },
  { description: 'Cold-chain surcharge', amount: '1,190.00' },
  { description: 'Loading dock labour', amount: '1,728.00' },
]

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const heroInvoice = useCurveReveal<HTMLDivElement>()
  const problemHeading = useCurveReveal<HTMLDivElement>()
  const problemLeft = useCurveReveal<HTMLDivElement>()
  const problemRight = useCurveReveal<HTMLDivElement>(0.46)
  const proofAu = useCurveReveal<HTMLDivElement>()
  const proofNp = useCurveReveal<HTMLDivElement>(0.46)
  const capabilityRow = useCurveReveal<HTMLDivElement>()
  const closingCta = useCurveReveal<HTMLDivElement>()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50">
      {/* Ambient glow — scoped to the top of the page, not per-section */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1200px] opacity-45"
        style={{
          backgroundImage:
            'radial-gradient(700px circle at 12% 8%, rgba(255,255,255,.07), transparent 62%), radial-gradient(560px circle at 78% 46%, rgba(255,255,255,.05), transparent 60%)',
        }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1310px] items-center justify-between px-5 md:px-14">
          <Logo size={22} className="text-zinc-50 [&_span]:text-zinc-50" />
          <nav className="hidden items-center gap-8 text-[13.5px] text-zinc-400 sm:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="transition-colors hover:text-zinc-50">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-zinc-50 hover:bg-white/10 hover:text-zinc-50" onClick={onSignIn}>
              Sign in
            </Button>
            <Button
              className="h-auto rounded-lg bg-zinc-50 px-[15px] py-2 text-[13.5px] font-medium text-zinc-950 hover:bg-zinc-200"
              onClick={onGetStarted}
            >
              Register
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1310px] px-5 md:px-14">
        {/* Hero — promise beside proof */}
        <section
          id="hero-invoice"
          className="grid scroll-mt-16 grid-cols-1 items-center gap-16 py-[76px] pb-15 lg:grid-cols-[1.02fr_.98fr]"
        >
          <div>
            <div className="inline-flex items-center gap-[9px] rounded-full border border-white/15 py-1.5 pr-[13px] pl-[9px]">
              <span className="size-1.5 rounded-full bg-green-400" />
              <span className="font-mono text-[11px] tracking-[0.1em] text-zinc-400 uppercase">
                2 jurisdictions verified · AU · NP
              </span>
            </div>
            <h1 className="mt-[26px] text-[48px] leading-[0.95] font-semibold tracking-[-0.045em] lg:text-[72px]">
              Quotes computed.
              <br />
              <span className="text-zinc-600">Never typed.</span>
            </h1>
            <p className="mt-[26px] max-w-[470px] text-[17.5px] leading-[1.6] text-pretty text-zinc-400">
              Tax rates, calendars and numbering conventions live as configuration, not code. One
              line-item list — correct totals, correct labels, in every jurisdiction you sell into.
            </p>
            <div className="mt-[34px] flex flex-wrap items-center gap-[14px]">
              <Button
                className="h-auto rounded-[9px] bg-zinc-50 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-950 hover:bg-zinc-200"
                onClick={onGetStarted}
              >
                Get started free
              </Button>
              <Button
                variant="ghost"
                render={<a href="#hero-invoice" />}
                nativeButton={false}
                className="h-auto rounded-[9px] border border-white/15 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-50 hover:bg-white/10"
              >
                See a live quote
              </Button>
            </div>
            <p className="mt-[18px] font-mono text-xs text-zinc-600">
              No card required · Your first quote in under 4 minutes
            </p>
          </div>

          <motion.div ref={heroInvoice.ref} style={heroInvoice.style} className="relative">
            <div className="absolute top-[26px] -right-[14px] -bottom-[14px] left-[26px] rounded-[14px] border border-white/10 bg-white/5" />
            <div className="relative rounded-[14px] bg-white text-zinc-950 shadow-[0_40px_80px_-24px_rgba(0,0,0,.7)]">
              <div className="flex items-start justify-between border-b border-[#e4e4e7] p-[26px_28px_20px]">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">Tax invoice</p>
                  <p className="mt-2 text-[21px] font-semibold tracking-tight">Kestrel Supply Co.</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">ABN 41 624 913 442</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11.5px]">QE-1042</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">09 Aug 2026</p>
                  <span className="mt-2 inline-block rounded-[5px] border border-[#e4e4e7] px-[7px] py-[3px] font-mono text-[10px] tracking-[0.1em] text-zinc-500">
                    AU · GST 10%
                  </span>
                </div>
              </div>

              <div className="px-[28px] py-[18px]">
                <div className="grid grid-cols-[1fr_96px] gap-[14px] pb-2 font-mono text-[9.5px] tracking-[0.14em] text-zinc-400 uppercase min-[640px]:grid-cols-[1fr_46px_96px]">
                  <span>Description</span>
                  <span className="hidden text-right min-[640px]:block">Qty</span>
                  <span className="text-right">Amount</span>
                </div>
                {AU_LINE_ITEMS.map((item) => (
                  <div
                    key={item.description}
                    className="grid grid-cols-[1fr_96px] items-baseline gap-[14px] border-t border-[#f4f4f5] py-[10px] min-[640px]:grid-cols-[1fr_46px_96px]"
                  >
                    <span className="text-[13.5px] font-medium">
                      {item.description}
                      {item.tag && <span className="ml-2 font-mono text-[10.5px] text-zinc-400">{item.tag}</span>}
                    </span>
                    <span className="hidden text-right font-mono text-[12.5px] text-zinc-600 min-[640px]:block">
                      {item.qty}
                    </span>
                    <span className="text-right text-[13.5px] font-medium tabular-nums">{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="m-[8px_20px_20px] rounded-[11px] bg-zinc-950 p-[18px_20px]">
                <div className="flex justify-between font-mono text-xs text-zinc-400">
                  <span>Subtotal (ex-GST)</span>
                  <span className="text-zinc-200 tabular-nums">11,345.45</span>
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                  <span>GST 10%</span>
                  <span className="text-zinc-200 tabular-nums">1,134.55</span>
                </div>
                <div className="my-[14px] h-px bg-white/15" />
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">
                      Total incl. GST
                    </p>
                    <p className="mt-1 font-mono text-[10.5px] text-zinc-600">computed · not typed</p>
                  </div>
                  <p className="text-[34px] font-semibold tracking-[-0.035em] text-zinc-50 tabular-nums">
                    $12,480<span className="text-[18px] text-zinc-500">.00</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Jurisdiction rate strip — full-bleed */}
      <section id="jurisdictions" className="scroll-mt-16 border-y border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {RATE_STRIP.map((cell, i) => (
            <div
              key={cell.label}
              className={cn(
                'p-5 px-6',
                i === 0 && 'md:pl-14',
                i === RATE_STRIP.length - 1 && 'md:pr-14',
                i < RATE_STRIP.length - 1 && 'border-r border-white/10',
              )}
            >
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-zinc-600 uppercase">{cell.label}</p>
              <p className="mt-1 text-sm font-medium text-zinc-50">{cell.value}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="relative mx-auto max-w-[1310px] px-5 md:px-14">
        {/* The problem */}
        <section id="problem" className="scroll-mt-16 pt-24">
          <motion.div ref={problemHeading.ref} style={problemHeading.style} className="text-center">
            <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">The problem · 01</p>
            <h2 className="mx-auto mt-4 max-w-[900px] text-[40px] leading-[0.98] font-semibold tracking-[-0.045em] text-balance lg:text-[64px]">
              One of these quotes costs
              <br />
              you the customer.
            </h2>
            <p className="mx-auto mt-6 max-w-[560px] text-[17px] leading-[1.6] text-zinc-400">
              Hand-typed totals drift from their labels. Quote Engine computes both from the same
              calculation, so they cannot disagree — in any jurisdiction you sell into.
            </p>
          </motion.div>

          <div className="mx-auto mt-11 grid max-w-[1080px] grid-cols-1 gap-[22px] lg:grid-cols-2">
            <motion.div
              ref={problemLeft.ref}
              style={problemLeft.style}
              className="rounded-[14px] border border-red-400/35 bg-red-400/[0.04]"
            >
              <div className="flex items-center justify-between border-b border-red-400/25 px-5 py-3">
                <p className="font-mono text-[10px] tracking-[0.16em] text-red-400 uppercase">Typed by hand</p>
                <p className="font-mono text-[11px] text-red-400">label ≠ total</p>
              </div>
              <div className="p-5">
                <div className="flex justify-between font-mono text-xs text-zinc-400">
                  <span>Subtotal (ex-GST)</span>
                  <span className="tabular-nums">12,480.00</span>
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                  <span>GST 10%</span>
                  <span className="tabular-nums">1,248.00</span>
                </div>
                <div className="my-[14px] h-px bg-red-400/30" />
                <div className="flex items-end justify-between">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">Total incl. GST</p>
                  <p className="text-[40px] font-semibold tracking-[-0.04em] tabular-nums">
                    $12,480<span className="text-lg text-zinc-500">.00</span>
                  </p>
                </div>
                <div className="mt-4 border-t border-white/10 pt-4 font-mono text-[11.5px] leading-[1.6] text-red-400">
                  The subtotal says ex-GST, the total says inclusive, and both show 12,480. One of
                  them is a lie — and your customer will find it.
                </div>
              </div>
            </motion.div>

            <motion.div
              ref={problemRight.ref}
              style={problemRight.style}
              className="rounded-[14px] border border-white/15 bg-white/[0.03]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <p className="font-mono text-[10px] tracking-[0.16em] text-zinc-50 uppercase">Computed</p>
                <p className="font-mono text-[11px] text-zinc-400">one source · AU GST 10%</p>
              </div>
              <div className="p-5">
                <div className="flex justify-between font-mono text-xs text-zinc-400">
                  <span>Subtotal (ex-GST)</span>
                  <span className="tabular-nums">11,345.45</span>
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                  <span>GST 10%</span>
                  <span className="tabular-nums">1,134.55</span>
                </div>
                <div className="my-[14px] h-px bg-white/15" />
                <div className="flex items-end justify-between">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">Total incl. GST</p>
                  <p className="text-[40px] font-semibold tracking-[-0.04em] tabular-nums">
                    $12,480<span className="text-lg text-zinc-500">.00</span>
                  </p>
                </div>
                <div className="mt-4 border-t border-white/10 pt-4 font-mono text-[11.5px] leading-[1.6] text-zinc-400">
                  11,345.45 × 10% = 1,134.55. Label and figure come from the same calculation —
                  they cannot drift apart.
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* The proof */}
        <section id="proof" className="scroll-mt-16 pt-25">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end lg:gap-12">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                The proof · 02 · one line-item list
              </p>
              <h2 className="mt-4 text-[44px] leading-[0.9] font-semibold tracking-[-0.05em] lg:text-[80px]">
                Same items.
                <br />
                <span className="text-zinc-600">Different law.</span>
              </h2>
            </div>
            <div className="max-w-[390px] lg:pb-2">
              <p className="text-[16.5px] leading-[1.65] text-zinc-400">
                GST sits inside the price. VAT is added on top. Nepal dates in Bikram Sambat,
                digits grouped by lakh. You enter the work once — the engine renders whichever
                document the law expects.
              </p>
              <Button
                variant="ghost"
                render={<a href="#proof" />}
                nativeButton={false}
                className="mt-5 h-auto rounded-[9px] border border-white/15 px-[18px] py-[10px] text-[13.5px] font-medium text-zinc-50 hover:bg-white/10"
              >
                See both documents
              </Button>
            </div>
          </div>

          <div className="mt-13 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <motion.div
              ref={proofAu.ref}
              style={proofAu.style}
              className="rounded-[14px] bg-white text-zinc-950 shadow-[0_-20px_70px_-20px_rgba(0,0,0,.6)]"
            >
              <div className="flex items-center justify-between border-b border-[#e4e4e7] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-[5px] border border-[#e4e4e7] px-[7px] py-[3px] font-mono text-[11px] tracking-[0.14em]">
                    AU
                  </span>
                  <span className="text-[15px] font-semibold">Tax invoice</span>
                </div>
                <p className="font-mono text-[11px] text-zinc-400">09 Aug 2026 · QE-1042</p>
              </div>
              <div className="px-5 py-4">
                {PROOF_LINE_ITEMS.map((item) => (
                  <div
                    key={item.description}
                    className="flex justify-between border-t border-[#f4f4f5] py-2.5 first:border-t-0"
                  >
                    <span className="text-[13.5px] font-medium">{item.description}</span>
                    <span className="text-[13.5px] font-medium tabular-nums">{item.amount}</span>
                  </div>
                ))}
              </div>
              <div className="m-[8px_20px_20px] rounded-[11px] bg-zinc-950 p-[18px_20px]">
                <div className="flex justify-between font-mono text-xs text-zinc-400">
                  <span>Subtotal (ex-GST)</span>
                  <span className="text-zinc-200 tabular-nums">7,998.18</span>
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                  <span>
                    GST 10% <span className="text-zinc-600 italic">· inside price</span>
                  </span>
                  <span className="text-zinc-200 tabular-nums">799.82</span>
                </div>
                <div className="my-[14px] h-px bg-white/15" />
                <div className="flex items-end justify-between">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">Total incl. GST</p>
                  <p className="text-[32px] font-semibold tracking-[-0.035em] text-zinc-50 tabular-nums">
                    $8,798.00
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              ref={proofNp.ref}
              style={proofNp.style}
              className="rounded-[14px] bg-white text-zinc-950 shadow-[0_-20px_70px_-20px_rgba(0,0,0,.6)]"
            >
              <div className="flex items-center justify-between border-b border-[#e4e4e7] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-[5px] border border-[#e4e4e7] px-[7px] py-[3px] font-mono text-[11px] tracking-[0.14em]">
                    NP
                  </span>
                  <span className="text-[15px] font-semibold">Abhikaran patra</span>
                </div>
                <p className="font-mono text-[11px] text-zinc-400">२०८३-०४-२५ · QE-1042</p>
              </div>
              <div className="px-5 py-4">
                {PROOF_LINE_ITEMS.map((item) => (
                  <div
                    key={item.description}
                    className="flex justify-between border-t border-[#f4f4f5] py-2.5 first:border-t-0"
                  >
                    <span className="text-[13.5px] font-medium">{item.description}</span>
                    <span className="text-[13.5px] font-medium tabular-nums">{item.amount}</span>
                  </div>
                ))}
              </div>
              <div className="m-[8px_20px_20px] rounded-[11px] bg-zinc-950 p-[18px_20px]">
                <div className="flex justify-between font-mono text-xs text-zinc-400">
                  <span>Subtotal (ex-VAT)</span>
                  <span className="text-zinc-200 tabular-nums">8,798.00</span>
                </div>
                <div className="mt-2 flex justify-between font-mono text-xs text-zinc-400">
                  <span>
                    VAT 13% <span className="text-zinc-600 italic">· added on top</span>
                  </span>
                  <span className="text-zinc-200 tabular-nums">1,143.74</span>
                </div>
                <div className="my-[14px] h-px bg-white/15" />
                <div className="flex items-end justify-between">
                  <p className="font-mono text-[9.5px] tracking-[0.16em] text-zinc-500 uppercase">Total incl. VAT</p>
                  <p className="text-[32px] font-semibold tracking-[-0.035em] text-zinc-50 tabular-nums whitespace-nowrap">
                    रू&nbsp;9,941.74
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Capability row */}
        <motion.div
          ref={capabilityRow.ref}
          style={capabilityRow.style}
          className="mt-24 grid grid-cols-1 divide-y divide-white/10 border-t border-white/10 md:grid-cols-3 md:divide-x md:divide-y-0"
        >
          {CAPABILITIES.map((c, i) => (
            <div key={c.title} className="p-7">
              <p className="font-mono text-[9.5px] tracking-[0.18em] text-zinc-600 uppercase">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="mt-3 text-[17px] leading-[1.45] font-medium text-zinc-50">{c.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{c.body}</p>
            </div>
          ))}
        </motion.div>

        {/* Closing CTA */}
        <motion.div ref={closingCta.ref} style={closingCta.style} className="py-22 text-center">
          <h2 className="text-[36px] leading-none font-semibold tracking-[-0.04em] lg:text-[52px]">
            Your first quote in four minutes.
          </h2>
          <div className="mt-[34px] flex flex-wrap items-center justify-center gap-[14px]">
            <Button
              className="h-auto rounded-[9px] bg-zinc-50 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-950 hover:bg-zinc-200"
              onClick={onGetStarted}
            >
              Get started free
            </Button>
            <Button
              variant="ghost"
              className="h-auto rounded-[9px] border border-white/15 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-50 hover:bg-white/10"
              onClick={onSignIn}
            >
              Sign in
            </Button>
          </div>
          <p className="mt-[18px] font-mono text-xs text-zinc-600">
            Australia · Nepal live today · one verified jurisdiction at a time
          </p>
        </motion.div>

        <footer className="flex flex-col items-center gap-4 border-t border-white/10 py-[26px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={18} showWordmark={false} className="[&_path]:fill-zinc-400 [&_rect]:fill-zinc-800" />
            <span className="font-mono text-xs text-zinc-600">&copy; {new Date().getFullYear()} Quote Engine</span>
          </div>
          <div className="flex items-center gap-[26px] font-mono text-xs text-zinc-500">
            <a href="#jurisdictions" className="hover:text-zinc-300">
              Jurisdictions
            </a>
            <a href="#" className="hover:text-zinc-300">
              Roadmap
            </a>
            <a href="#" className="hover:text-zinc-300">
              Privacy
            </a>
            <a href="#" className="hover:text-zinc-300">
              Contact
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}
