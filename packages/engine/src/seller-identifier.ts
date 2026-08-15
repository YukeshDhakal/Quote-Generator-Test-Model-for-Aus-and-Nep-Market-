import type { SellerIdentifier } from './types.js';

/**
 * Single source for seller-identifier validation messages. Message wording is generated here
 * (label + formatDescription) - jurisdiction files supply only the data (label/format/required),
 * never a hand-written message, so "PAN must be 9 digits" can't drift from what the regex
 * actually checks.
 */
export function validateSellerIdentifierValue(option: SellerIdentifier, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return option.required ? `${option.label} is required.` : null;
  const pattern = new RegExp(option.format);
  return pattern.test(value) ? null : `${option.label} must be ${option.formatDescription}.`;
}
