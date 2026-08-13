import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Download, Mail, Pencil, Send as SendIcon } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatAmount } from '@quote-engine/engine'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getGmailStatus,
  getQuote,
  gmailAuthorizeUrl,
  listSendEvents,
  markSent,
  quotePdfUrl,
  sendViaGmail,
  type QuoteDetail as QuoteDetailData,
  type SendEvent,
} from '../api'

const OUTCOME_LABEL: Record<SendEvent['outcome'], string> = {
  downloaded: 'Downloaded',
  marked_sent: 'Marked as sent',
  accepted: 'Accepted by Google',
  failed: 'Failed',
}

const METHOD_LABEL: Record<SendEvent['method'], string> = {
  manual: 'Download',
  gmail: 'Gmail',
}

function SendSection({ quoteId, customerEmail }: { quoteId: string; customerEmail: string | null }) {
  const [events, setEvents] = useState<SendEvent[] | null>(null)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null)
  const [gmailEmail, setGmailEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [marking, setMarking] = useState(false)
  const [markedNote, setMarkedNote] = useState(false)

  const [showCompose, setShowCompose] = useState(false)
  const [to, setTo] = useState(customerEmail ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reauthRequired, setReauthRequired] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  function refresh() {
    listSendEvents(quoteId)
      .then((r) => {
        setEvents(r.events)
        setSubject((s) => s || r.defaultSubject)
        setBody((b) => b || r.defaultBody)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load send history.'))
    getGmailStatus()
      .then((s) => {
        setGmailConnected(s.connected)
        setGmailEmail(s.email)
      })
      .catch(() => {})
  }

  useEffect(() => {
    refresh()

    const params = new URLSearchParams(window.location.search)
    const gmailParam = params.get('gmail')
    if (gmailParam === 'connected') setNotice('Google account connected.')
    else if (gmailParam === 'business_mismatch')
      setError('You switched businesses before finishing — try Connect again from this business.')
    else if (gmailParam === 'error') setError('Connecting Google failed — try again.')
    if (gmailParam) {
      const url = new URL(window.location.href)
      url.searchParams.delete('gmail')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId])

  async function handleMarkSent() {
    setMarking(true)
    setError(null)
    try {
      await markSent(quoteId)
      setMarkedNote(true)
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sent.')
    } finally {
      setMarking(false)
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendError(null)
    setReauthRequired(false)
    setSendSuccess(false)
    try {
      await sendViaGmail(quoteId, { to, subject, body })
      setSendSuccess(true)
      refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send.'
      if (message.includes('gmail_reauth_required')) {
        setReauthRequired(true)
      } else {
        setSendError(message)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Download is a first-class option, not a fallback - always shown, never gated behind
              Gmail being connected. A resend-by-download is just another visit to this link. */}
          <a
            href={quotePdfUrl(quoteId)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'default' })}
            onClick={() => setTimeout(refresh, 1000)}
          >
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </a>
          <Button variant="outline" disabled={marking} onClick={handleMarkSent}>
            <CheckCircle2 className="mr-1 h-4 w-4" /> {marking ? 'Marking…' : 'Mark as sent'}
          </Button>

          {gmailConnected === false && (
            <a href={gmailAuthorizeUrl(quoteId)} className={buttonVariants({ variant: 'outline' })}>
              <Mail className="mr-1 h-4 w-4" /> Connect Google
            </a>
          )}
          {gmailConnected === true && !showCompose && (
            <Button variant="outline" onClick={() => setShowCompose(true)}>
              <SendIcon className="mr-1 h-4 w-4" /> Send via Gmail
            </Button>
          )}
        </div>

        {gmailConnected === true && gmailEmail && (
          <p className="text-xs text-muted-foreground">Connected as {gmailEmail}.</p>
        )}
        {markedNote && <p className="text-sm text-muted-foreground">Marked as sent.</p>}
        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        {showCompose && (
          <form onSubmit={handleSend} className="space-y-3 rounded-md border p-3">
            <div className="space-y-2">
              <Label htmlFor="gmailTo">To</Label>
              <Input id="gmailTo" type="email" required value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmailSubject">Subject</Label>
              <Input id="gmailSubject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmailBody">Message</Label>
              <Textarea id="gmailBody" required rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
            </div>
            {sendSuccess && (
              <p className="text-sm text-muted-foreground">
                Accepted by Google — not confirmed delivered; bounces, if any, arrive in your own inbox.
              </p>
            )}
            {reauthRequired && (
              <p className="text-sm text-destructive">
                Google access needs to be reconnected.{' '}
                <a href={gmailAuthorizeUrl(quoteId)} className="underline">
                  Reconnect Google
                </a>
              </p>
            )}
            {sendError && <p className="text-sm text-destructive">{sendError}</p>}
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <div className="mb-2 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">Send history</div>
          {!events ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : events.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No send attempts yet.</p>
          ) : (
            <div className="divide-y rounded-md border">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">
                      {METHOD_LABEL[ev.method]}
                      {ev.recipientEmail ? ` — ${ev.recipientEmail}` : ''}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(ev.sentAt).toLocaleString()} · by {ev.sentByName}
                      {ev.errorDetail ? ` · ${ev.errorDetail}` : ''}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium ${ev.outcome === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    {OUTCOME_LABEL[ev.outcome]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

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

      <SendSection quoteId={data.quoteRow.id} customerEmail={customer?.customerEmail ?? null} />
    </motion.div>
  )
}
