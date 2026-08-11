import { describe, expect, it } from 'vitest';
import { calculateQuote } from '../src/calculate.js';
import { AU_PROFILE } from '../src/jurisdictions/au.js';
import type { LineItem, Quote } from '../src/types.js';

// 7 lines at a price that doesn't divide evenly, so per-line rounding accumulates
// differently than rounding the summed total once (PRD V-5).
const lineItems: LineItem[] = Array.from({ length: 7 }, (_, i) => ({
  productCode: `SKU-${i}`,
  description: 'Item',
  qty: 1,
  unitPrice: 10.005,
  taxable: true,
}));

function quoteWithRoundingStage(applyAt: 'line' | 'total'): Quote {
  return {
    quoteNumber: 'TEST',
    date: '2026-01-01',
    documentTypeKey: 'quote',
    jurisdictionProfile: {
      ...AU_PROFILE,
      rounding: { ...AU_PROFILE.rounding, applyAt },
    },
    lineItems,
  };
}

describe('rounding.applyAt (V-5)', () => {
  it('produces a different line subtotal for "line" vs "total" rounding on the same inputs', () => {
    const perLine = calculateQuote(quoteWithRoundingStage('line'));
    const perTotal = calculateQuote(quoteWithRoundingStage('total'));

    // 7 * 10.005 = 70.035 unrounded.
    // "total": summed unrounded then rounded once -> 70.04 (well, 70.03 half-up... assert actual values below).
    // "line": each 10.005 rounds to 10.01 first, summed -> 70.07.
    expect(perLine.totals.lineSubtotal).not.toBe(perTotal.totals.lineSubtotal);
    expect(perLine.totals.lineSubtotal).toBe(70.07);
    expect(perTotal.totals.lineSubtotal).toBe(70.04);
  });
});
