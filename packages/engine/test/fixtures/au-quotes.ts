import { AU_PROFILE } from '../../src/jurisdictions/au.js';
import type { Quote } from '../../src/types.js';

/**
 * AUQU0085 as issued printed "Subtotal ex-GST $32.95" / "Order total inc GST $32.95" —
 * self-contradictory (see PRD §1). The fixture models the real (inclusive) line value;
 * the golden assertions check the engine now generates the correct label instead.
 */
export const AUQU0085: Quote = {
  quoteNumber: 'AUQU0085',
  date: '2026-01-15',
  documentTypeKey: 'quote',
  jurisdictionProfile: AU_PROFILE,
  lineItems: [
    { productCode: 'SKU-1', description: 'Item', qty: 1, unitPrice: 32.95, taxable: true },
  ],
};

export const AUQU0086: Quote = {
  quoteNumber: 'AUQU0086',
  date: '2026-01-16',
  documentTypeKey: 'quote',
  jurisdictionProfile: AU_PROFILE,
  lineItems: [
    { productCode: 'SKU-2', description: 'Bulk item', qty: 1, unitPrice: 7345.0, taxable: true },
  ],
  orderDiscount: { type: 'percent', value: 0.05 },
};
