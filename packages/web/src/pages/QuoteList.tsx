import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AU_PROFILE, NP_PROFILE, compareProfileDates, formatAmount, type JurisdictionProfile } from '@quote-engine/engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangeFilter, type DateRangeValue } from '../components/DateRangeFilter'
import { getBusiness, listQuotes, type QuoteSummary } from '../api'
import { resolvePreset, type RangePreset } from '../lib/date-range'

const PROFILES: Record<string, JurisdictionProfile> = { AU: AU_PROFILE, NP: NP_PROFILE }
const VALID_PRESETS: RangePreset[] = ['all', '7d', '30d', 'month', 'fy', 'custom']

interface QuoteListProps {
  onSelect: (id: string) => void
  onNew: () => void
  refreshKey: number
}

function readFiltersFromUrl(): { search: string; range: DateRangeValue } {
  const params = new URLSearchParams(window.location.search)
  const presetParam = params.get('range')
  const preset = VALID_PRESETS.includes(presetParam as RangePreset) ? (presetParam as RangePreset) : 'all'
  return {
    search: params.get('search') ?? '',
    range: {
      preset,
      customFrom: preset === 'custom' ? params.get('from') : null,
      customTo: preset === 'custom' ? params.get('to') : null,
    },
  }
}

function writeFiltersToUrl(search: string, range: DateRangeValue) {
  const params = new URLSearchParams()
  params.set('view', 'quotes')
  if (search) params.set('search', search)
  if (range.preset !== 'all') params.set('range', range.preset)
  if (range.preset === 'custom') {
    if (range.customFrom) params.set('from', range.customFrom)
    if (range.customTo) params.set('to', range.customTo)
  }
  const next = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState(null, '', next)
}

export function QuoteList({ onSelect, onNew, refreshKey }: QuoteListProps) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([])
  const initial = useMemo(readFiltersFromUrl, [])
  const [search, setSearch] = useState(initial.search)
  const [range, setRange] = useState<DateRangeValue>(initial.range)
  const [jurisdiction, setJurisdiction] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBusiness()
      .then((b) => setJurisdiction(b.jurisdiction))
      .catch(() => setJurisdiction(null))
  }, [])

  const profile = jurisdiction ? PROFILES[jurisdiction] : null
  const resolved = profile ? resolvePreset(profile, range.preset, { from: range.customFrom, to: range.customTo }) : null
  const customRangeValid =
    !profile || !resolved || !resolved.from || !resolved.to
      ? true
      : (compareProfileDates(profile, resolved.from, resolved.to) ?? 0) <= 0

  const filtersActive = search.trim() !== '' || range.preset !== 'all'

  useEffect(() => {
    writeFiltersToUrl(search, range)
  }, [search, range])

  useEffect(() => {
    if (!profile) return
    // A custom range where "to" is before "from" is invalid — don't fetch, DateRangeFilter
    // already shows the inline validation message for this case.
    if (!customRangeValid) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    listQuotes(search, resolved?.from ?? null, resolved?.to ?? null)
      .then((data) => {
        if (!cancelled) setQuotes(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load quotes.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, range, profile, refreshKey])

  function clearFilters() {
    setSearch('')
    setRange({ preset: 'all', customFrom: null, customTo: null })
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Quotes</h1>
        <Button onClick={onNew}>+ New quote</Button>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <Input
          placeholder="Search by quote number or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {profile && <DateRangeFilter profile={profile} value={range} onChange={setRange} />}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : quotes.length === 0 ? (
        filtersActive ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No quotes match these filters.</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No quotes yet.</p>
        )
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
            {quotes.map((q) => (
              <TableRow key={q.id} className="cursor-pointer" onClick={() => onSelect(q.id)}>
                <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                <TableCell>{q.customerName}</TableCell>
                <TableCell>{q.documentTypeTitle}</TableCell>
                <TableCell>{q.date}</TableCell>
                <TableCell className="text-right">{formatAmount(q.grandTotal, PROFILES[q.jurisdiction])}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </motion.div>
  )
}
