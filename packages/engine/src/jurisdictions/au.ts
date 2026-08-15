import type { JurisdictionProfile } from '../types.js';

export const AU_PROFILE: JurisdictionProfile = {
  jurisdiction: 'AU',
  version: 1,
  currency: { code: 'AUD', symbol: '$', minorUnit: 'cent', decimals: 2 },
  tax: {
    label: 'GST',
    rate: 0.1,
    basis: 'inclusive',
    derivation: 'divisor',
    divisor: 11,
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
  calendar: { system: 'gregorian', format: 'DD/MM/YYYY' },
  // Australian income/GST year: 1 July - 30 June.
  financialYear: { startMonth: 7, startDay: 1 },
  numerals: { grouping: 'western', wordsRequired: false, wordsLocale: null },
  sellerIdentifiers: [
    { key: 'ABN', label: 'ABN', required: true, format: '^\\d{11}$', formatDescription: '11 digits', position: 'footer' },
  ],
  documentTypes: [{ key: 'quote', title: 'Quote', showTax: true }],
  lineItemColumns: ['product_code', 'description', 'qty', 'unit_price', 'total'],
  taxableMarking: 'asterisk',
  validityDays: 30,
};
