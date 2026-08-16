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

export function PrivacyPolicy() {
  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-[820px] px-5 py-[76px] pb-24 md:px-14">
        <p className="font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">Legal</p>
        <h1 className="mt-4 text-[36px] leading-[1.1] font-semibold tracking-[-0.03em] lg:text-[44px]">
          Privacy Policy
        </h1>
        <p className="mt-4 text-[14.5px] text-zinc-500">Last updated {LAST_UPDATED}</p>

        <Section title="Who operates this service">
          <p>
            Quote Engine (quoteengine.dev) is operated by Yukesh Dhakal. Questions about this policy or
            your data can be sent to{' '}
            <a href="mailto:ukeshdhakal11@gmail.com" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              ukeshdhakal11@gmail.com
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <p>Account data you provide directly: name, email address, and a bcrypt-hashed password (if you sign up with email/password rather than Google).</p>
          <p>
            Business data you enter to use the product: business name, jurisdiction, branding (logo, accent
            colour), terms text, and the quotes, line items, and customer details you create.
          </p>
          <p>
            If you sign in with Google, we receive your name, email address, and a Google account
            identifier via Google's ID-token sign-in flow — nothing else, and no password is stored for
            that account.
          </p>
        </Section>

        <Section title="Google Gmail access (gmail.send)">
          <p>
            If you choose to connect Gmail to send quotes directly from Quote Engine, you'll go through a
            separate Google consent screen requesting the <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[13px]">gmail.send</code> scope only.
            This is a narrow, "send-only" permission:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>We can compose and send an email — with your quote PDF attached — from your connected account, only when you click "Send" on a specific quote.</li>
            <li>We cannot read, search, or view any message already in your mailbox. The gmail.send scope does not grant that access, and we don't request any scope that would.</li>
            <li>No Quote Engine employee or automated system reads the content of your Gmail account. We only see the message we ourselves composed for that one send.</li>
            <li>Your Gmail refresh token is encrypted at rest (AES-256-GCM) and is used solely to obtain short-lived access tokens for that send action.</li>
            <li>You can disconnect Gmail access at any time from within the app, which deletes the stored token; you can also revoke access directly from your Google Account's security settings.</li>
          </ul>
          <p>
            Quote Engine's use and transfer of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We do not use Gmail data for advertising, do not
            sell it, and do not use it for any purpose beyond sending the quote email you explicitly
            requested.
          </p>
        </Section>

        <Section title="Where data is stored">
          <p>
            Application data (accounts, businesses, quotes) is stored in a managed Postgres database
            (Supabase). Generated PDF files and uploaded logos are stored on the application server's
            attached disk. The application server runs on Fly.io; the web app is served by Vercel. These
            are infrastructure subprocessors, not third parties we share your business data with for
            their own purposes.
          </p>
        </Section>

        <Section title="How we use your data">
          <ul className="list-disc space-y-2 pl-5">
            <li>To provide the service: creating and rendering your quotes, generating PDFs, and sending them when you ask us to.</li>
            <li>To authenticate you and keep your business's data isolated from every other business on the platform.</li>
            <li>To operate and secure the service — e.g. rate limiting and abuse prevention.</li>
          </ul>
          <p>We do not sell your data, and we do not use your business or customer data to train any model.</p>
        </Section>

        <Section title="Data retention and deletion">
          <p>
            We retain your account and business data for as long as your account is active. To request
            deletion of your account and associated data, email{' '}
            <a href="mailto:ukeshdhakal11@gmail.com" className="text-zinc-300 underline underline-offset-2 hover:text-zinc-50">
              ukeshdhakal11@gmail.com
            </a>{' '}
            and we'll action it within a reasonable time, subject to any records we're legally required to
            retain.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes materially, we'll update the date at the top of this page. Continued
            use of Quote Engine after a change constitutes acceptance of the updated policy.
          </p>
        </Section>
      </main>
    </MarketingLayout>
  )
}
