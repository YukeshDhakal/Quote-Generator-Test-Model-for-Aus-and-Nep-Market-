import type { GeneratedLabels, JurisdictionProfile } from './types.js';

export function generateLabels(profile: JurisdictionProfile): GeneratedLabels {
  const { label, basis, rate } = profile.tax;

  if (basis === 'inclusive') {
    return {
      subtotalLabel: `Subtotal (inc ${label})`,
      taxLabel: `${label} included`,
      grandTotalLabel: `Order total (inc ${label})`,
    };
  }

  return {
    subtotalLabel: 'Total',
    taxLabel: `${(rate * 100).toFixed(0)}% ${label}`,
    grandTotalLabel: 'Grand Total',
  };
}
