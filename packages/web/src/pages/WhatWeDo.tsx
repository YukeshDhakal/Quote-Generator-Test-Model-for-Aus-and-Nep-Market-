import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MarketingLayout } from '../components/MarketingLayout'

const STEPS = [
  {
    n: '01',
    title: 'Pick your jurisdiction',
    body: 'Set once in Business Settings — GST for Australia, VAT for Nepal. Every quote you create inherits the correct tax model automatically.',
  },
  {
    n: '02',
    title: 'Add line items',
    body: 'Description, quantity, unit price. Mark lines taxable or not. The engine handles the rest.',
  },
  {
    n: '03',
    title: 'Generate a branded PDF',
    body: 'Your logo, your terms, a legally sequential quote number — rendered from the same numbers you see on screen.',
  },
]

export function WhatWeDo() {
  const navigate = useNavigate()

  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[1310px] px-5 md:px-14">
        {/* Hero */}
        <section className="py-[76px] pb-15 text-center">
          <h1 className="mx-auto max-w-[820px] text-[44px] leading-[1.05] font-semibold tracking-[-0.04em] lg:text-[64px]">
            A quotation template that can't contradict its own numbers.
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-[17px] leading-[1.6] text-zinc-400">
            Quote Engine generates branded GST or VAT quotation templates where the tax label and
            the total are calculated together — not typed separately, and never able to disagree.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-[14px]">
            <Button
              className="h-auto rounded-[9px] bg-zinc-50 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-950 hover:bg-zinc-200"
              onClick={() => navigate('/signup')}
            >
              Get started free
            </Button>
            <Button
              variant="ghost"
              render={<Link to="/jurisdictions" />}
              className="h-auto rounded-[9px] border border-white/15 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-50 hover:bg-white/10"
            >
              See it for your country
            </Button>
          </div>
        </section>

        {/* The problem */}
        <section className="border-t border-white/10 pt-20">
          <p className="text-center font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            The problem
          </p>
          <h2 className="mx-auto mt-4 max-w-[760px] text-center text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] lg:text-[44px]">
            A quote document where the label and the arithmetic disagree.
          </h2>
          <p className="mx-auto mt-6 max-w-[600px] text-center text-[17px] leading-[1.6] text-zinc-400">
            This is a real pattern from a real issued document — not a hypothetical. Three numbers
            printed on the same quote, and they cannot all be true:
          </p>

          <div className="mx-auto mt-11 max-w-[520px] rounded-[14px] border border-red-400/35 bg-red-400/[0.04]">
            <div className="border-b border-red-400/25 px-5 py-3">
              <p className="font-mono text-[10px] tracking-[0.16em] text-red-400 uppercase">As issued</p>
            </div>
            <div className="space-y-3 p-6 font-mono text-[15px] text-zinc-300">
              <div className="flex justify-between">
                <span>Subtotal ex-GST</span>
                <span className="tabular-nums">$32.95</span>
              </div>
              <div className="flex justify-between">
                <span>GST included</span>
                <span className="tabular-nums">$3.00</span>
              </div>
              <div className="flex justify-between border-t border-red-400/20 pt-3 text-red-300">
                <span>Total inc GST</span>
                <span className="tabular-nums">$32.95</span>
              </div>
            </div>
            <p className="border-t border-red-400/20 px-6 py-4 font-mono text-[12.5px] leading-[1.6] text-red-400">
              If the subtotal is really $32.95 <em>ex</em>-GST, adding $3.00 GST cannot also total
              $32.95. One of these three numbers was typed by hand and doesn't match the other two.
            </p>
          </div>

          <p className="mx-auto mt-8 max-w-[560px] text-center text-[15px] leading-[1.6] text-zinc-400">
            A quotation template built from separate typed fields lets this happen silently. Quote
            Engine computes the subtotal, the tax, and the total from one calculation — so a label
            can never describe a number that isn't actually there.
          </p>
        </section>

        {/* How it works */}
        <section className="border-t border-white/10 pt-20">
          <p className="text-center font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            How it works
          </p>
          <h2 className="mx-auto mt-4 max-w-[600px] text-center text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] lg:text-[40px]">
            Three steps, one correct document.
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n}>
                <p className="font-mono text-[13px] text-zinc-600">{step.n}</p>
                <h3 className="mt-3 text-[18px] font-medium text-zinc-50">{step.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Branded templates */}
        <section className="border-t border-white/10 pt-20">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            Branded templates
          </p>
          <h2 className="mt-4 max-w-[600px] text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] lg:text-[40px]">
            Your business, on the document your customer opens.
          </h2>
          <p className="mt-6 max-w-[600px] text-[15px] leading-[1.6] text-zinc-400">
            Two library templates to start from, and a logo upload that handles square marks and
            wide header lockups without distortion. Your business name, terms text, and the
            identifier your jurisdiction requires (ABN or PAN) are placed automatically — set once
            in Business Settings, correct on every quote after that.
          </p>
        </section>

        {/* What we deliberately don't do */}
        <section className="border-t border-white/10 pt-20 pb-24">
          <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            What we deliberately don't do
          </p>
          <h2 className="mt-4 max-w-[600px] text-[34px] leading-[1.15] font-semibold tracking-[-0.03em] lg:text-[40px]">
            Quotes, not invoices.
          </h2>
          <p className="mt-6 max-w-[640px] text-[15px] leading-[1.6] text-zinc-400">
            Quote Engine stops at the quotation. It does not generate tax invoices, does not carry
            e-invoicing mandates, and doesn't claim any tax software certification — because it
            isn't trying to be your accounting system. Use it alongside whichever one you already
            have. When a quote is accepted, the invoice is a separate document your existing
            systems already know how to produce; we're not in the middle of that step.
          </p>
        </section>

        {/* CTA */}
        <section className="border-t border-white/10 py-22 text-center">
          <h2 className="text-[36px] leading-none font-semibold tracking-[-0.04em] lg:text-[48px]">
            See it for Australia or Nepal.
          </h2>
          <div className="mt-[34px] flex flex-wrap items-center justify-center gap-[14px]">
            <Button
              className="h-auto rounded-[9px] bg-zinc-50 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-950 hover:bg-zinc-200"
              onClick={() => navigate('/signup')}
            >
              Get started free
            </Button>
            <Button
              variant="ghost"
              render={<Link to="/jurisdictions" />}
              className="h-auto rounded-[9px] border border-white/15 px-[22px] py-[13px] text-[14.5px] font-medium text-zinc-50 hover:bg-white/10"
            >
              Browse jurisdictions
            </Button>
          </div>
        </section>
      </main>
    </MarketingLayout>
  )
}
