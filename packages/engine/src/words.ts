import type { JurisdictionProfile } from './types.js';

const ONES = [
  'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitWords(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(ONES[Math.floor(n / 100)], 'Hundred');
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
    if (n > 0) parts.push(ONES[n]);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

/** Indian numbering scale (crore/lakh/thousand), independent of currency locale. */
function scaleWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(' ');
}

const CURRENCY_NAMES: Record<string, string> = {
  NPR: 'Rupees',
  AUD: 'Dollars',
};

/**
 * English-language rendering only. profile.numerals.wordsLocale (e.g. ne_IN) is not yet
 * honoured — a real ne_IN / Devanagari renderer is separate work, not covered by this engine yet.
 */
export function amountInWords(value: number, profile: JurisdictionProfile): string {
  const decimals = profile.currency.decimals;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const intPart = Math.floor(rounded);
  const fracPart = Math.round((rounded - intPart) * factor);
  const currencyName = CURRENCY_NAMES[profile.currency.code] ?? profile.currency.code;

  let words = `${scaleWords(intPart)} ${currencyName}`;
  if (fracPart > 0) {
    words += ` and ${scaleWords(fracPart)} ${profile.currency.minorUnit}`;
  }
  return `${words} Only`;
}
