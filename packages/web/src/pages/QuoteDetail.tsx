import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Pencil } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatAmount } from '@quote-engine/engine'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getQuote, quotePdfUrl, type QuoteDetail as QuoteDetailData } from '../api'

export function QuoteDetail() {
  const { id: quoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<QuoteDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteId) return
    let cancelled = false
    setData(null)
    getQuote(quoteId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load quote.')
      })
    return () => {
      cancelled = true
    }
  }, [quoteId])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>

  const { quote, result, customer } = data
  const profile = quote.jurisdictionProfile

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <Button
        variant="ghost"
        size="sm"
        render={<Link to="/quotes" />}
        className="-ml-2 text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to quotes
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {result.documentType.title} {quote.quoteNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {customer?.customerName}
            {customer?.companyName ? ` — ${customer.companyName}` : ''} · {quote.date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/quotes/${data.quoteRow.id}/edit`)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <a
            href={quotePdfUrl(data.quoteRow.id)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'default' })}
          >
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </a>
        </div>
      </div>

      {/* Desktop: table. On narrow screens this is replaced by stacked records below so nothing
          gets crushed into unreadable columns. */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lineItems.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.productCode}</TableCell>
                  <TableCell>
                    {item.description}
                    {item.taxable && profile.taxableMarking === 'asterisk' ? ' *' : ''}
                  </TableCell>
                  <TableCell>{item.qty}</TableCell>
                  <TableCell className="text-right">{formatAmount(item.unitPrice, profile)}</TableCell>
                  <TableCell className="text-right">{formatAmount(item.qty * item.unitPrice, profile)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: stacked records, money right-aligned in a mono column. */}
      <Card className="md:hidden">
        <CardContent className="divide-y pt-2">
          {quote.lineItems.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-medium">
                  {item.description}
                  {item.taxable && profile.taxableMarking === 'asterisk' ? ' *' : ''}
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {item.qty} × {formatAmount(item.unitPrice, profile)}
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-medium tabular-nums">
                {formatAmount(item.qty * item.unitPrice, profile)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals stay one inverted panel regardless of viewport, so the computed figure never
          competes with the surrounding layout. */}
      <div className="max-w-md rounded-lg bg-zinc-950 p-5 text-zinc-50">
        <div className="flex justify-between border-b border-white/10 py-1.5 font-mono text-[12.5px] text-zinc-400">
          <span>{result.labels.subtotalLabel}</span>
          <span className="tabular-nums text-zinc-200">{formatAmount(result.totals.lineSubtotal, profile)}</span>
        </div>
        {result.totals.orderDiscountAmount > 0 && (
          <div className="flex justify-between border-b border-white/10 py-1.5 font-mono text-[12.5px] text-zinc-400">
            <span>Order discount</span>
            <span className="tabular-nums text-zinc-200">-{formatAmount(result.totals.orderDiscountAmount, profile)}</span>
          </div>
        )}
        {result.totals.deliveryAmount > 0 && (
          <div className="flex justify-between border-b border-white/10 py-1.5 font-mono text-[12.5px] text-zinc-400">
            <span>Delivery</span>
            <span className="tabular-nums text-zinc-200">{formatAmount(result.totals.deliveryAmount, profile)}</span>
          </div>
        )}
        {result.documentType.showTax && (
          <div className="flex justify-between border-b border-white/10 py-1.5 font-mono text-[12.5px] text-zinc-400">
            <span>{result.labels.taxLabel}</span>
            <span className="tabular-nums text-zinc-200">{formatAmount(result.totals.taxAmount, profile)}</span>
          </div>
        )}
        <div className="flex items-end justify-between pt-3">
          <div>
            <div className="font-mono text-[10px] tracking-[0.16em] text-zinc-500 uppercase">
              {result.labels.grandTotalLabel}
            </div>
            <div className="mt-1 font-mono text-[10.5px] text-zinc-500">{profile.currency.code} · computed</div>
          </div>
          <div className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {formatAmount(result.totals.grandTotal, profile)}
          </div>
        </div>
        {result.amountInWords && <p className="mt-3 text-xs text-zinc-500 italic">{result.amountInWords}</p>}
      </div>
    </motion.div>
  )
}
