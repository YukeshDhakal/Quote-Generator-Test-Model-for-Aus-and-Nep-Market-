import { describe, expect, it } from 'vitest';
import { validateSellerIdentifierValue } from '../src/seller-identifier.js';
import { AU_PROFILE } from '../src/jurisdictions/au.js';
import { NP_PROFILE } from '../src/jurisdictions/np.js';

const [abn] = AU_PROFILE.sellerIdentifiers;
const [pan, vatReg] = NP_PROFILE.sellerIdentifiers;

describe('validateSellerIdentifierValue', () => {
  it('accepts an 11-digit value for AU (ABN)', () => {
    expect(validateSellerIdentifierValue(abn, '51824753556')).toBeNull();
  });

  it('rejects an 11-digit value for NP (PAN expects 9)', () => {
    expect(validateSellerIdentifierValue(pan, '51824753556')).toBe('PAN must be 9 digits.');
  });

  it('accepts a 9-digit value for NP PAN and VAT Registration No, using each option\'s own label', () => {
    expect(validateSellerIdentifierValue(pan, '123456789')).toBeNull();
    expect(validateSellerIdentifierValue(vatReg, '123456789')).toBeNull();
    expect(validateSellerIdentifierValue(vatReg, '51824753556')).toBe('VAT Registration No. must be 9 digits.');
  });

  it('reports a required-but-empty value distinctly from a malformed one', () => {
    expect(validateSellerIdentifierValue(abn, '')).toBe('ABN is required.');
    expect(validateSellerIdentifierValue(abn, '   ')).toBe('ABN is required.');
  });

  it('ignores surrounding whitespace when checking format', () => {
    expect(validateSellerIdentifierValue(abn, '  51824753556  ')).toBeNull();
  });
});
