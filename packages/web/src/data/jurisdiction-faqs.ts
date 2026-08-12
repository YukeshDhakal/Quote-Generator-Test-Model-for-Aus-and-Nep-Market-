import { formatTaxRate, type LiveJurisdiction } from './jurisdictions'

export interface Faq {
  question: string
  answer: string
}

/**
 * FAQ copy per jurisdiction — backs both the visible accordion on the jurisdiction page and its
 * FAQPage JSON-LD (same content, one source, so the structured data never drifts from what a
 * visitor actually reads). Numeric facts are interpolated from the jurisdiction data rather than
 * typed as literals, so a rate change updates this copy too.
 */
export function getFaqsForJurisdiction(j: LiveJurisdiction): Faq[] {
  const rate = formatTaxRate(j.tax.rate)
  const basisPhrase = j.tax.basis === 'inclusive' ? 'inside the price' : 'added on top of the price'

  if (j.code === 'AU') {
    return [
      {
        question: `Does ${j.tax.label} go inside or outside the price on an Australian quote?`,
        answer: `Inside. Australian GST is ${rate} and is shown as ${basisPhrase} — the line total already includes GST, and the quote breaks out how much of it is tax rather than adding tax on top.`,
      },
      {
        question: "What's the difference between a quote and a tax invoice in Australia?",
        answer:
          'A quote is a proposed price before work is agreed. A tax invoice is a specific legal document issued after a taxable sale, with its own requirements. Quote Engine generates quotes — it does not produce tax invoices, so there is nothing here that substitutes for one.',
      },
      {
        question: 'Can I add my ABN automatically?',
        answer: `Yes. ABN is the seller identifier for Australian quotes and is shown in the header of every quote once set in your business profile — you never type it per quote.`,
      },
      {
        question: 'What date and number format does an Australian quote use?',
        answer: `Dates are Gregorian, formatted ${j.calendar.format}. Numbers use standard western grouping (e.g. 1,234,567.89).`,
      },
    ]
  }

  if (j.code === 'NP') {
    return [
      {
        question: `Is ${j.tax.label} added on top or included in the price on a Nepali quotation?`,
        answer: `Added on top. Nepali VAT is ${rate} and is shown as ${basisPhrase} — the subtotal is ex-VAT, and VAT is calculated and added to reach the total.`,
      },
      {
        question: 'Does a Nepali quotation use Bikram Sambat dates?',
        answer: `Yes. Dates are entered and displayed in the Bikram Sambat calendar, formatted ${j.calendar.format} — not Gregorian.`,
      },
      {
        question: 'How are numbers grouped on a Nepali quotation?',
        answer: 'Lakh/crore grouping (e.g. 10,74,834.13), not western thousands grouping — matching how amounts are conventionally written in Nepal.',
      },
      {
        question: "What's the difference between a Quotation and an Estimate?",
        answer:
          'Both use the same line items and calculation. A Quotation shows the VAT breakdown; an Estimate presents the same total without it. Neither is a tax invoice — Quote Engine does not produce those.',
      },
      {
        question: 'Can I add my PAN automatically?',
        answer: 'Yes. PAN is the seller identifier for Nepali quotations and appears in the header of every document once set in your business profile.',
      },
    ]
  }

  return []
}
