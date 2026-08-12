import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AU_PROFILE, NP_PROFILE, formatAmount, type JurisdictionProfile } from '@quote-engine/engine'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getDashboard, type DashboardData } from '../api'

const PROFILES: Record<string, JurisdictionProfile> = { AU: AU_PROFILE, NP: NP_PROFILE }
const COUNTRY_NAMES: Record<string, string> = { AU: 'Australia', NP: 'Nepal' }

const MONTH_YEAR = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    getDashboard().then(setData)
  }, [])

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (!data.businessJurisdiction) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Set your business jurisdiction first</h1>
        <p className="text-sm text-muted-foreground">
          Your dashboard is organised around the jurisdiction your business operates in. Pick one in Business
          Settings to get started.
        </p>
        <Button onClick={() => navigate('/settings')}>Go to Business Settings</Button>
      </div>
    )
  }

  const profile = PROFILES[data.businessJurisdiction]
  const stat = data.totalsByJurisdiction.find((t) => t.jurisdiction === data.businessJurisdiction)
  const countryName = COUNTRY_NAMES[data.businessJurisdiction] ?? data.businessJurisdiction
  const sampleNumber = formatAmount(1234567, profile)

  return (
    <motion.div
      className="space-y-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-end justify-between pb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">Overview · {MONTH_YEAR}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Quotes computed.</h1>
        </div>
        <Button onClick={() => navigate('/quotes/new')}>+ New quote</Button>
      </div>

      {/* Hairline stat rail — no card chrome, just dividers. Mobile-first: one column stacked,
          two columns from sm, four from lg — a fixed 2-up grid at mobile widths squeezed long
          currency figures into ~170px cells and made them overlap the neighbouring cell. */}
      <div className="grid grid-cols-1 border-t border-b sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 border-b px-1 py-5 pr-5 sm:border-r lg:border-b-0">
          <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Total quotes</div>
          <div
            className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl"
            title={String(data.quoteCount)}
          >
            {data.quoteCount}
          </div>
        </div>
        <div className="min-w-0 border-b px-1 py-5 pr-5 lg:border-r lg:border-b-0">
          <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            {countryName} quoted value
          </div>
          <div
            className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl"
            title={formatAmount(stat?.grandTotal ?? 0, profile)}
          >
            {formatAmount(stat?.grandTotal ?? 0, profile)}
          </div>
        </div>
        <div className="min-w-0 border-b px-1 py-5 pr-5 sm:border-r sm:border-b-0">
          <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Ex-{profile.tax.label} value</div>
          <div
            className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl"
            title={formatAmount(stat?.subtotal ?? 0, profile)}
          >
            {formatAmount(stat?.subtotal ?? 0, profile)}
          </div>
        </div>
        <div className="min-w-0 px-1 py-5 pr-5">
          <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
            {profile.tax.label} payable
          </div>
          <div
            className="mt-4 truncate font-mono text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl lg:text-2xl xl:text-3xl"
            title={formatAmount(stat?.taxTotal ?? 0, profile)}
          >
            {formatAmount(stat?.taxTotal ?? 0, profile)}
          </div>
        </div>
      </div>

      {/* Jurisdiction object card — the business's one locked jurisdiction as a real object,
          not just a summary line: its rate, calendar, digit grouping, and document types. */}
      <div className="mt-6 overflow-hidden rounded-xl border">
        <div className="flex items-start justify-between p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded border px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
                {profile.jurisdiction}
              </span>
              <span className="text-lg font-semibold tracking-tight">{countryName}</span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {profile.documentTypes.map((dt) => dt.title).join(' · ')} · {profile.calendar.system} · {sampleNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Rate</div>
            <div className="mt-1.5 text-xl font-semibold tracking-tight">
              {profile.tax.label} {(profile.tax.rate * 100).toFixed(0)}%
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {profile.tax.basis === 'inclusive' ? 'inside the price' : 'added on top'}
            </div>
          </div>
        </div>

        <div className="m-3.5 rounded-lg bg-zinc-950 p-5 text-zinc-50">
          <div className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
            Quoted value · {stat?.quoteCount ?? 0} {stat?.quoteCount === 1 ? 'quote' : 'quotes'}
          </div>
          <div className="mt-3.5 font-mono text-4xl font-semibold tracking-tight tabular-nums">
            {formatAmount(stat?.grandTotal ?? 0, profile)}
          </div>
          <div className="my-3 h-px bg-white/10" />
          <div className="flex justify-between font-mono text-[11px] text-zinc-400">
            <span>
              ex-{profile.tax.label} {formatAmount(stat?.subtotal ?? 0, profile)}
            </span>
            <span>
              {profile.tax.label} {formatAmount(stat?.taxTotal ?? 0, profile)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3 font-mono text-xs text-muted-foreground">
          <span>{data.nextNumber ? `Next: ${data.nextNumber}` : ''}</span>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            Manage profiles
          </Button>
        </div>
      </div>

      <div className="pt-6">
        <div className="flex items-baseline justify-between pb-3">
          <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">Recent quotes</span>
          <button
            type="button"
            onClick={() => navigate('/quotes')}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all →
          </button>
        </div>
        {data.recentQuotes.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No quotes yet — create your first one.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentQuotes.map((q) => (
                <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotes/${q.id}`)}>
                  <TableCell className="font-mono text-xs">{q.quoteNumber}</TableCell>
                  <TableCell className="font-medium">{q.customerName}</TableCell>
                  <TableCell className="text-muted-foreground">{q.documentTypeTitle}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{q.date}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatAmount(q.grandTotal, PROFILES[q.jurisdiction])}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </motion.div>
  )
}
