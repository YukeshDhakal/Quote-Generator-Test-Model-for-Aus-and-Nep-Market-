import type { JurisdictionProfile } from '../types.js';

export const NP_PROFILE: JurisdictionProfile = {
  jurisdiction: 'NP',
  version: 1,
  currency: { code: 'NPR', symbol: 'रू', minorUnit: 'paisa', decimals: 2 },
  tax: {
    label: 'VAT',
    rate: 0.13,
    basis: 'exclusive',
    derivation: 'additive',
    divisor: null,
    exemptCategories: [],
  },
  calculationOrder: [
    'line_subtotal',
    'line_discount',
    'order_discount',
    'delivery',
    'tax',
    'rounding',
  ],
  rounding: { mode: 'half_up', precision: 2, applyAt: 'total' },
  calendar: { system: 'bikram_sambat', format: 'YYYY/MM/DD' },
  // Nepali fiscal year: Shrawan 1 - Ashad end (month 4 of the starting BS year through month 3 of the next).
  financialYear: { startMonth: 4, startDay: 1 },
  numerals: { grouping: 'lakh_crore', wordsRequired: true, wordsLocale: 'ne_IN' },
  sellerIdentifiers: [
    { key: 'PAN', label: 'PAN', required: true, position: 'header_right' },
  ],
  documentTypes: [
    { key: 'quotation', title: 'Quotation', showTax: true },
    { key: 'estimate', title: 'Estimate', showTax: false },
  ],
  lineItemColumns: ['sn', 'description', 'qty', 'amount', 'total', 'warranty'],
  taxableMarking: 'none',
  validityDays: null,
};
