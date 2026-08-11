import { describe, expect, it } from 'vitest';
import { financialYearTag } from '../src/financial-year.js';
import { AU_PROFILE } from '../src/jurisdictions/au.js';
import { NP_PROFILE } from '../src/jurisdictions/np.js';

describe('financialYearTag (AU, July-June)', () => {
  it('tags a date after 1 July as the year starting that July', () => {
    expect(financialYearTag(AU_PROFILE, '11/08/2026')).toBe('2627');
  });

  it('tags a date before 1 July as the year starting the previous July', () => {
    expect(financialYearTag(AU_PROFILE, '15/01/2026')).toBe('2526');
  });

  it('tags 1 July itself as the start of the new year', () => {
    expect(financialYearTag(AU_PROFILE, '01/07/2026')).toBe('2627');
  });

  it('tags 30 June as still the outgoing year', () => {
    expect(financialYearTag(AU_PROFILE, '30/06/2026')).toBe('2526');
  });
});

describe('financialYearTag (NP, Shrawan-Ashad)', () => {
  it('tags a Shrawan date as the year starting that Shrawan', () => {
    expect(financialYearTag(NP_PROFILE, '2083/04/15')).toBe('8384');
  });

  it('tags an Ashad date as still the outgoing year', () => {
    expect(financialYearTag(NP_PROFILE, '2083/03/30')).toBe('8283');
  });
});
