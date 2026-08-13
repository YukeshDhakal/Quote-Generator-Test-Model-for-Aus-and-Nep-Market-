import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { AU_PROFILE, NP_PROFILE, type Discount, type JurisdictionProfile, type LineItem } from '@quote-engine/engine'
import { BikramSambatDatePicker } from './BikramSambatDatePicker'
import { GregorianDatePicker } from './GregorianDatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const PROFILES: Record<string, JurisdictionProfile> = { AU: AU_PROFILE, NP: NP_PROFILE }
const JURISDICTION_LABELS: Record<string, string> = { AU: 'Australia (GST)', NP: 'Nepal (VAT)' }

type DraftLineItem = {
  productCode: string
  description: string
  qty: string
  unitPrice: string
  taxable: boolean
}

const emptyLineItem = (): DraftLineItem => ({
  productCode: '',
  description: '',
  qty: '1',
  unitPrice: '',
  taxable: true,
})

function lineItemsToDraft(items: LineItem[]): DraftLineItem[] {
  return items.map((item) => ({
    productCode: item.productCode,
    description: item.description,
    qty: String(item.qty),
    unitPrice: String(item.unitPrice),
    taxable: item.taxable,
  }))
}

export interface QuoteFormInitial {
  customerName?: string
  companyName?: string
  customerEmail?: string
  deliveryAddress?: string
  billingAddress?: string
  documentTypeKey?: string
  date?: string
  lineItems?: LineItem[]
  orderDiscount?: Discount
  delivery?: { mode: 'flat' | 'per_quantity'; amount: number }
}

export interface QuoteFormPayload {
  customerName: string
  companyName?: string
  customerEmail?: string
  deliveryAddress?: string
  billingAddress?: string
  documentTypeKey: string
  date: string
  lineItems: LineItem[]
  orderDiscount?: Discount
  delivery?: { mode: 'flat' | 'per_quantity'; amount: number }
}

interface QuoteFormProps {
  heading: string
  submitLabel: string
  submittingLabel: string
  /** The business's own locked jurisdiction — never a per-quote choice, so always shown read-only. */
  jurisdiction: string
  initial?: QuoteFormInitial
  onSubmit: (payload: QuoteFormPayload) => Promise<void>
}

export function QuoteForm({ heading, submitLabel, submittingLabel, jurisdiction, initial, onSubmit }: QuoteFormProps) {
  const [customerName, setCustomerName] = useState(initial?.customerName ?? '')
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '')
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? '')
  const [deliveryAddress, setDeliveryAddress] = useState(initial?.deliveryAddress ?? '')
  const [billingAddress, setBillingAddress] = useState(initial?.billingAddress ?? '')

  const profile = PROFILES[jurisdiction]
  const [documentTypeKey, setDocumentTypeKey] = useState(initial?.documentTypeKey ?? profile.documentTypes[0].key)
  const [date, setDate] = useState(initial?.date ?? '')

  const [lineItems, setLineItems] = useState<DraftLineItem[]>(
    initial?.lineItems?.length ? lineItemsToDraft(initial.lineItems) : [emptyLineItem()],
  )
  // Master switch over every line item's individual "Taxable" flag — for a tax-exempt quote
  // (export sale, exempt customer) rather than unchecking each line by hand. Toggling off sets
  // every line to non-taxable, so tax genuinely computes to zero rather than being hidden.
  const [taxEnabled, setTaxEnabled] = useState(() => lineItems.some((item) => item.taxable))

  function setAllTaxable(enabled: boolean) {
    setTaxEnabled(enabled)
    setLineItems((items) => items.map((item) => ({ ...item, taxable: enabled })))
  }

  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>(initial?.orderDiscount?.type ?? 'none')
  // Percent is shown/typed as a whole number (5 = 5%) — converted to the engine's 0-1 fraction on submit.
  const [discountValue, setDiscountValue] = useState(
    initial?.orderDiscount
      ? String(initial.orderDiscount.type === 'percent' ? initial.orderDiscount.value * 100 : initial.orderDiscount.value)
      : '',
  )

  const [deliveryMode, setDeliveryMode] = useState<'none' | 'flat' | 'per_quantity'>(initial?.delivery?.mode ?? 'none')
  const [deliveryAmount, setDeliveryAmount] = useState(initial?.delivery ? String(initial.delivery.amount) : '')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const documentTypes = useMemo(() => profile.documentTypes, [profile])

  function updateLineItem(index: number, patch: Partial<DraftLineItem>) {
    setLineItems((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addLineItem() {
    setLineItems((items) => [...items, { ...emptyLineItem(), taxable: taxEnabled }])
  }

  function removeLineItem(index: number) {
    setLineItems((items) => (items.length > 1 ? items.filter((_, i) => i !== index) : items))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!customerName.trim()) {
      setError('Customer name is required.')
      return
    }
    if (!date.trim()) {
      setError('Date is required.')
      return
    }

    const parsedLineItems: LineItem[] = lineItems.map((item) => ({
      productCode: item.productCode,
      description: item.description,
      qty: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      taxable: item.taxable,
    }))

    if (parsedLineItems.some((item) => !item.description || item.qty <= 0 || item.unitPrice < 0)) {
      setError('Every line item needs a description, a positive quantity, and a non-negative unit price.')
      return
    }

    if (discountType === 'percent') {
      const pct = Number(discountValue)
      if (!(pct >= 0 && pct <= 100)) {
        setError('Percent discount must be between 0 and 100.')
        return
      }
    }

    setSubmitting(true)
    try {
      await onSubmit({
        customerName,
        companyName: companyName || undefined,
        customerEmail: customerEmail || undefined,
        deliveryAddress: deliveryAddress || undefined,
        billingAddress: billingAddress || undefined,
        documentTypeKey,
        date,
        lineItems: parsedLineItems,
        orderDiscount:
          discountType === 'none'
            ? undefined
            : {
                type: discountType,
                value: discountType === 'percent' ? (Number(discountValue) || 0) / 100 : Number(discountValue) || 0,
              },
        delivery: deliveryMode === 'none' ? undefined : { mode: deliveryMode, amount: Number(deliveryAmount) || 0 },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="max-w-3xl space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer name *</Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company</Label>
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Email</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery address</Label>
            <Input id="deliveryAddress" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingAddress">Billing address</Label>
            <Input id="billingAddress" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quote</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Jurisdiction</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
              {JURISDICTION_LABELS[jurisdiction] ?? jurisdiction}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Document type</Label>
            <Select
              items={Object.fromEntries(documentTypes.map((dt) => [dt.key, dt.title]))}
              value={documentTypeKey}
              onValueChange={(v) => v && setDocumentTypeKey(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((dt) => (
                  <SelectItem key={dt.key} value={dt.key}>
                    {dt.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date ({profile.calendar.system === 'bikram_sambat' ? 'Bikram Sambat' : 'Gregorian'})</Label>
            {profile.calendar.system === 'bikram_sambat' ? (
              <BikramSambatDatePicker value={date} onChange={setDate} />
            ) : (
              <GregorianDatePicker value={date} onChange={setDate} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line items</CardTitle>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {profile.tax.label}
            <Switch checked={taxEnabled} onCheckedChange={setAllTaxable} />
          </label>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-2 items-center gap-2 border-b pb-3 last:border-b-0 sm:grid-cols-[1fr_2fr_0.6fr_0.8fr_auto_auto] sm:border-0 sm:pb-0"
            >
              {/* At this width the row is 3 stacked pairs — product/description, qty/price,
                  taxable/delete — a pure grid-template reflow of the same six children, not a
                  restructured DOM, so it never drifts out of sync with the sm:+ layout. */}
              <Input
                placeholder="Product code"
                value={item.productCode}
                onChange={(e) => updateLineItem(index, { productCode: e.target.value })}
              />
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(index, { description: e.target.value })}
                required
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Qty"
                value={item.qty}
                onChange={(e) => updateLineItem(index, { qty: e.target.value })}
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Unit price"
                value={item.unitPrice}
                onChange={(e) => updateLineItem(index, { unitPrice: e.target.value })}
              />
              <div className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                <Checkbox
                  checked={item.taxable}
                  disabled={!taxEnabled}
                  onCheckedChange={(checked) => updateLineItem(index, { taxable: checked === true })}
                />
                Taxable
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeLineItem(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            + Add line item
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order discount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                items={{ none: 'None', percent: 'Percent', fixed: 'Fixed amount' }}
                value={discountType}
                onValueChange={(v) => setDiscountType(v as typeof discountType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percent">Percent</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {discountType !== 'none' && (
              <div className="space-y-2">
                <Label>{discountType === 'percent' ? 'Percent (e.g. 5 for 5%)' : 'Amount'}</Label>
                <Input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : undefined}
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                items={{ none: 'None', flat: 'Flat rate', per_quantity: 'Per quantity' }}
                value={deliveryMode}
                onValueChange={(v) => setDeliveryMode(v as typeof deliveryMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="flat">Flat rate</SelectItem>
                  <SelectItem value="per_quantity">Per quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {deliveryMode !== 'none' && (
              <div className="space-y-2">
                <Label>Amount {deliveryMode === 'per_quantity' ? '(per unit)' : ''}</Label>
                <Input type="number" min="0" step="any" value={deliveryAmount} onChange={(e) => setDeliveryAmount(e.target.value)} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </motion.form>
  )
}
