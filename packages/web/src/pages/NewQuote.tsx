import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { QuoteForm, type QuoteFormPayload } from '../components/QuoteForm'
import { createQuote, createRequest, getBusiness } from '../api'

export function NewQuote() {
  const navigate = useNavigate()
  const [jurisdiction, setJurisdiction] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    getBusiness().then((b) => setJurisdiction(b.jurisdiction))
  }, [])

  async function handleSubmit(payload: QuoteFormPayload) {
    const req = await createRequest({
      customerName: payload.customerName,
      companyName: payload.companyName,
      customerEmail: payload.customerEmail,
      deliveryAddress: payload.deliveryAddress,
      billingAddress: payload.billingAddress,
    })

    const quote = await createQuote(req.id, {
      documentTypeKey: payload.documentTypeKey,
      date: payload.date,
      lineItems: payload.lineItems,
      orderDiscount: payload.orderDiscount,
      delivery: payload.delivery,
    })

    navigate(`/quotes/${quote.quoteRow.id}`)
  }

  if (jurisdiction === undefined) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (jurisdiction === null) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Set your business jurisdiction first</h1>
        <p className="text-sm text-muted-foreground">
          Every quote is issued under your business's jurisdiction — the tax rules, calendar, and numbering all
          come from it. Pick one in Business Settings before creating your first quote.
        </p>
        <Button onClick={() => navigate('/settings')}>Go to Business Settings</Button>
      </div>
    )
  }

  return (
    <QuoteForm
      heading="New request & quote"
      submitLabel="Create quote"
      submittingLabel="Creating…"
      jurisdiction={jurisdiction}
      onSubmit={handleSubmit}
    />
  )
}
