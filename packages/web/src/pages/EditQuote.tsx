import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { QuoteForm, type QuoteFormPayload } from '../components/QuoteForm'
import { getQuote, updateQuote, updateRequest, type QuoteDetail } from '../api'

export function EditQuote() {
  const { id: quoteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<QuoteDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!quoteId) return
    let cancelled = false
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

  async function handleSubmit(payload: QuoteFormPayload) {
    if (!data) return
    await updateRequest(data.quoteRow.request_id, {
      customerName: payload.customerName,
      companyName: payload.companyName,
      deliveryAddress: payload.deliveryAddress,
      billingAddress: payload.billingAddress,
    })

    await updateQuote(data.quoteRow.id, {
      documentTypeKey: payload.documentTypeKey,
      date: payload.date,
      lineItems: payload.lineItems,
      orderDiscount: payload.orderDiscount,
      delivery: payload.delivery,
    })

    navigate(`/quotes/${data.quoteRow.id}`)
  }

  return (
    <QuoteForm
      heading={`Edit ${data.quote.quoteNumber}`}
      submitLabel="Save changes"
      submittingLabel="Saving…"
      jurisdiction={data.quote.jurisdictionProfile.jurisdiction}
      initial={{
        customerName: data.customer?.customerName,
        companyName: data.customer?.companyName ?? undefined,
        deliveryAddress: data.customer?.deliveryAddress ?? undefined,
        billingAddress: data.customer?.billingAddress ?? undefined,
        documentTypeKey: data.quote.documentTypeKey,
        date: data.quote.date,
        lineItems: data.quote.lineItems,
        orderDiscount: data.quote.orderDiscount,
        delivery: data.quote.delivery,
      }}
      onSubmit={handleSubmit}
    />
  )
}
