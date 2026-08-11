import { describe, expect, it } from 'vitest';
import { compareProfileDates, isWithinProfileDateRange } from '../src/date-compare.js';
import { AU_PROFILE } from '../src/jurisdictions/au.js';
import { NP_PROFILE } from '../src/jurisdictions/np.js';

describe('compareProfileDates', () => {
  it('orders AU dates chronologically despite DD/MM/YYYY not being lexicographically sortable', () => {
    expect(compareProfileDates(AU_PROFILE, '01/02/2026', '15/01/2026')).toBeGreaterThan(0);
  });

  it('treats equal dates as equal', () => {
    expect(compareProfileDates(AU_PROFILE, '11/08/2026', '11/08/2026')).toBe(0);
  });

  it('orders NP dates chronologically', () => {
    expect(compareProfileDates(NP_PROFILE, '2083/04/01', '2083/03/30')).toBeGreaterThan(0);
  });

  it('returns null rather than guessing when a date fails to parse', () => {
    expect(compareProfileDates(AU_PROFILE, 'not-a-date', '11/08/2026')).toBeNull();
  });
});

describe('isWithinProfileDateRange (AU)', () => {
  it('includes a date exactly on the from boundary', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '11/08/2026', '11/08/2026', '20/08/2026')).toBe(true);
  });

  it('includes a date exactly on the to boundary', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '20/08/2026', '11/08/2026', '20/08/2026')).toBe(true);
  });

  it('includes a single-day range where from equals to equals the date', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '11/08/2026', '11/08/2026', '11/08/2026')).toBe(true);
  });

  it('excludes a date before the from boundary', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '10/08/2026', '11/08/2026', '20/08/2026')).toBe(false);
  });

  it('excludes a date after the to boundary', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '21/08/2026', '11/08/2026', '20/08/2026')).toBe(false);
  });

  it('is open-ended when to is omitted', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '01/01/2099', '11/08/2026', null)).toBe(true);
  });

  it('is open-ended when from is omitted', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '01/01/2000', null, '20/08/2026')).toBe(true);
  });

  it('with both bounds omitted, includes everything', () => {
    expect(isWithinProfileDateRange(AU_PROFILE, '01/01/2000', null, null)).toBe(true);
  });
});

describe('isWithinProfileDateRange — AU/NP equivalence', () => {
  it('a Nepal tenant filtering by BS dates returns the same inclusion as an equivalent Gregorian range', () => {
    // 2083/04/15 BS and 2083/04/20 BS bracket 2083/04/17 BS the same way an equivalent
    // Gregorian range brackets its middle date — same relative-position logic, different calendar.
    expect(isWithinProfileDateRange(NP_PROFILE, '2083/04/17', '2083/04/15', '2083/04/20')).toBe(true);
    expect(isWithinProfileDateRange(AU_PROFILE, '17/08/2026', '15/08/2026', '20/08/2026')).toBe(true);

    expect(isWithinProfileDateRange(NP_PROFILE, '2083/04/14', '2083/04/15', '2083/04/20')).toBe(false);
    expect(isWithinProfileDateRange(AU_PROFILE, '14/08/2026', '15/08/2026', '20/08/2026')).toBe(false);
  });
});
