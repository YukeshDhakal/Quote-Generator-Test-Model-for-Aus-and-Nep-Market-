import { MarketingLayout } from '../components/MarketingLayout'

const LAST_UPDATED = '16 August 2026'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/10 py-10">
      <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-zinc-50">{title}</h2>
      <div className="mt-4 space-y-4 text-[14.5px] leading-[1.7] text-zinc-400">{children}</div>
    </section>
  )
}

export function TermsOfService() {
  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[820px] px-5 py-[76px] pb-24 md:px-14">
        <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Legal</p>
        <h1 className="mt-4 text-[36px] leading-[1.1] font-semibold tracking-[-0.03em] lg:text-[44px]">
          Terms of Service
        </h1>
        <p className="mt-4 text-[14.5px] text-zinc-500">Last updated {LAST_UPDATED}</p>

        <Section title="The service">
          <p>
            Quote Engine (quoteengine.dev) is a tool for generating branded, jurisdiction-correct
            quotation documents. It is operated by Yukesh Dhakal, contactable at{' '}
            <a href="mailto:ukeshdhakal11@gmail.com" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              ukeshdhakal11@gmail.com
            </a>
            . By creating an account, you agree to these terms.
          </p>
        </Section>

        <Section title="Quotes, not invoices">
          <p>
            Quote Engine generates quotations. It does not generate tax invoices, does not carry any
            e-invoicing mandate, and does not claim any tax software certification in any jurisdiction.
            The tax calculations follow each supported jurisdiction's general GST/VAT rules as configured
            in the product, but you — not Quote Engine — are responsible for verifying the numbers on any
            document before it's relied on for tax, legal, or accounting purposes.
          </p>
        </Section>

        <Section title="Your account and data">
          <ul className="list-disc space-y-2 pl-5">
            <li>You're responsible for the accuracy of the business, customer, and line-item data you enter.</li>
            <li>You're responsible for keeping your login credentials confidential.</li>
            <li>You may use the Gmail-send feature only to send quotes you've created through your own connected Google account, and only for its intended purpose.</li>
            <li>Don't use the service to send unsolicited bulk email, or for any unlawful purpose.</li>
          </ul>
        </Section>

        <Section title="Service availability">
          <p>
            Quote Engine is provided on an "as is" and "as available" basis. We aim for reliable uptime
            but don't guarantee the service will be uninterrupted or error-free. We may modify or
            discontinue features with reasonable notice where practical.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the fullest extent permitted by law, Quote Engine and its operator are not liable for
            indirect, incidental, or consequential damages arising from use of the service, including
            reliance on a generated quote's tax calculation without independent verification.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using the service and request deletion of your account at any time by emailing{' '}
            <a href="mailto:ukeshdhakal11@gmail.com" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              ukeshdhakal11@gmail.com
            </a>
            . We may suspend or terminate accounts that violate these terms.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            If these terms change materially, we'll update the date at the top of this page. Continued
            use of Quote Engine after a change constitutes acceptance of the updated terms.
          </p>
        </Section>
      </main>
    </MarketingLayout>
  )
}
