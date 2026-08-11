import { NP_PROFILE } from '../../src/jurisdictions/np.js';
import type { Quote } from '../../src/types.js';

/**
 * R.K. Trading & House quotation. The source document's footer claims "included vat" while
 * the printed maths adds VAT on top (PRD §1, Example B). The fixture models the real
 * (exclusive) line value; the golden assertions check the engine generates a label that
 * doesn't contradict the arithmetic.
 */
export const RK_TRADING_QUOTATION: Quote = {
  quoteNumber: 'RKTH-Q-0001',
  date: '2083/04/26',
  documentTypeKey: 'quotation',
  jurisdictionProfile: NP_PROFILE,
  lineItems: [
    { productCode: 'ITEM-1', description: 'Goods', qty: 1, unitPrice: 358495.0, taxable: true },
  ],
};

/**
 * Same request as RK_TRADING_QUOTATION, rendered as the Estimate variant: PRD §8 says this
 * must be the same data with the Total column and VAT block suppressed, no code branch.
 */
export const RK_TRADING_ESTIMATE: Quote = {
  ...RK_TRADING_QUOTATION,
  quoteNumber: 'RKTH-E-0001',
  documentTypeKey: 'estimate',
};
