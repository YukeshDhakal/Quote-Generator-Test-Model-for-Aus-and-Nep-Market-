import { describe, expect, it } from 'vitest';
import { formatAmount } from '../src/format.js';
import { AU_PROFILE } from '../src/jurisdictions/au.js';
import { NP_PROFILE } from '../src/jurisdictions/np.js';

describe('formatAmount', () => {
  it('groups AU amounts by thousands (western)', () => {
    expect(formatAmount(1234567.8, AU_PROFILE)).toBe('$ 1,234,567.80');
  });

  it('groups NP amounts by lakh/crore, matching PRD §4 example (12,34,567)', () => {
    expect(formatAmount(1234567, NP_PROFILE)).toBe('रू 12,34,567.00');
  });

  it('diverges from western grouping once the amount passes one lakh (100,000)', () => {
    expect(formatAmount(358495, NP_PROFILE)).toBe('रू 3,58,495.00');
  });

  it('lakh/crore and western grouping coincide under one lakh', () => {
    expect(formatAmount(8495, NP_PROFILE)).toBe('रू 8,495.00');
  });
});
