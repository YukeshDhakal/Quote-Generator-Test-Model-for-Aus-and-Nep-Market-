import type { JurisdictionProfile } from './types.js';

function groupWestern(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last3 = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

export function formatAmount(value: number, profile: JurisdictionProfile): string {
  const decimals = profile.currency.decimals;
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  const grouped =
    profile.numerals.grouping === 'lakh_crore' ? groupIndian(intPart) : groupWestern(intPart);
  const sign = value < 0 ? '-' : '';
  const withFraction = fracPart ? `${grouped}.${fracPart}` : grouped;
  return `${sign}${profile.currency.symbol} ${withFraction}`;
}
