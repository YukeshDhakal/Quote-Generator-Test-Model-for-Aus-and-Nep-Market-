import { describe, expect, it } from 'vitest';
import { calculateQuote } from '../src/calculate.js';
import { formatAmount } from '../src/format.js';
import { AUQU0085, AUQU0086 } from './fixtures/au-quotes.js';
import { RK_TRADING_ESTIMATE, RK_TRADING_QUOTATION } from './fixtures/np-quotes.js';

describe('AUQU0085 (single line, no discount)', () => {
  const result = calculateQuote(AUQU0085);

  it('does not print a total that cannot be recomputed (V-1)', () => {
    expect(result.totals.grandTotal).toBe(32.95);
  });

  it('derives GST as inclusive-of-total, not printed as a separate ex-GST subtotal', () => {
    expect(result.totals.taxAmount).toBe(3.0);
  });

  it('generates a label consistent with the value, unlike the issued document (V-2)', () => {
    expect(result.labels.subtotalLabel).toBe('Subtotal (inc GST)');
    expect(result.labels.grandTotalLabel).toBe('Order total (inc GST)');
    expect(result.labels.taxLabel).toBe('GST included');
  });
});

describe('AUQU0086 (bulk discount applied to gross, GST back-computed)', () => {
  const result = calculateQuote(AUQU0086);

  it('applies the order discount to the pre-tax gross', () => {
    expect(result.totals.orderDiscountAmount).toBe(367.25);
  });

  it('holds the discounted total as the GST-inclusive order total', () => {
    expect(result.totals.grandTotal).toBe(6977.75);
  });

  it('back-computes GST from the discounted inclusive total (÷11)', () => {
    expect(result.totals.taxAmount).toBe(634.34);
  });
});

describe('R.K. Trading quotation (VAT exclusive, additive)', () => {
  const result = calculateQuote(RK_TRADING_QUOTATION);

  it('matches the issued subtotal', () => {
    expect(result.totals.lineSubtotal).toBe(358495.0);
  });

  it('adds VAT on top of the subtotal instead of deriving it from an inclusive total', () => {
    expect(result.totals.taxAmount).toBe(46604.35);
  });

  it('matches the issued grand total', () => {
    expect(result.totals.grandTotal).toBe(405099.35);
  });

  it('generates a label that does not contradict the arithmetic, unlike the "included vat" footer', () => {
    expect(result.labels.taxLabel).toBe('13% VAT');
    expect(result.labels.grandTotalLabel).toBe('Grand Total');
  });

  it('requires amount-in-words for NP (FR-10)', () => {
    expect(result.amountInWords).not.toBeNull();
    expect(result.amountInWords).toContain('Only');
  });

  it('formats the grand total in lakh/crore grouping, not the western-style comma the source document printed (FR-9)', () => {
    // The issued document printed "405,099.35" (western). Correct NP grouping is "4,05,099.35".
    expect(formatAmount(result.totals.grandTotal, RK_TRADING_QUOTATION.jurisdictionProfile)).toBe(
      'रू 4,05,099.35',
    );
  });
});

describe('R.K. Trading estimate variant (same data, VAT block suppressed, no code branch)', () => {
  const quotation = calculateQuote(RK_TRADING_QUOTATION);
  const estimate = calculateQuote(RK_TRADING_ESTIMATE);

  it('computes identical totals to the quotation', () => {
    expect(estimate.totals).toEqual(quotation.totals);
  });

  it('differs only in which document type is active', () => {
    expect(estimate.documentType.key).toBe('estimate');
    expect(estimate.documentType.showTax).toBe(false);
    expect(quotation.documentType.showTax).toBe(true);
  });
});
