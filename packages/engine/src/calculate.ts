import { generateLabels } from './labels.js';
import { amountInWords } from './words.js';
import type { CalculationStep, ComputedTotals, Discount, Quote, QuoteResult } from './types.js';

function roundHalfUp(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function applyDiscount(amount: number, discount: Discount | undefined): number {
  if (!discount) return 0;
  return discount.type === 'percent' ? amount * discount.value : discount.value;
}

interface CalcState {
  lineSubtotal: number;
  lineDiscountTotal: number;
  orderDiscountAmount: number;
  deliveryAmount: number;
  runningTotal: number;
  taxAmount: number;
  grandTotal: number;
}

const INITIAL_STATE: CalcState = {
  lineSubtotal: 0,
  lineDiscountTotal: 0,
  orderDiscountAmount: 0,
  deliveryAmount: 0,
  runningTotal: 0,
  taxAmount: 0,
  grandTotal: 0,
};

type StepFn = (state: CalcState, quote: Quote) => CalcState;

// Each step reads only from `quote` and the running state — this is what lets a jurisdiction
// reorder or omit steps (profile.calculationOrder) without touching this code (PRD §6.2).
const STEPS: Record<CalculationStep, StepFn> = {
  line_subtotal: (state, quote) => {
    const perLine = quote.jurisdictionProfile.rounding.applyAt === 'line';
    const precision = quote.jurisdictionProfile.rounding.precision;
    const lineSubtotal = quote.lineItems.reduce((sum, item) => {
      let total = item.qty * item.unitPrice;
      if (perLine) total = roundHalfUp(total, precision);
      return sum + total;
    }, 0);
    return { ...state, lineSubtotal, runningTotal: lineSubtotal };
  },

  line_discount: (state, quote) => {
    const lineDiscountTotal = quote.lineItems.reduce((sum, item) => {
      if (!item.lineDiscount) return sum;
      return sum + applyDiscount(item.qty * item.unitPrice, item.lineDiscount);
    }, 0);
    return { ...state, lineDiscountTotal, runningTotal: state.runningTotal - lineDiscountTotal };
  },

  order_discount: (state, quote) => {
    const orderDiscountAmount = applyDiscount(state.runningTotal, quote.orderDiscount);
    return { ...state, orderDiscountAmount, runningTotal: state.runningTotal - orderDiscountAmount };
  },

  delivery: (state, quote) => {
    const totalQty = quote.lineItems.reduce((sum, item) => sum + item.qty, 0);
    const delivery = quote.delivery;
    const deliveryAmount = !delivery
      ? 0
      : delivery.mode === 'flat'
        ? delivery.amount
        : delivery.amount * totalQty;
    return { ...state, deliveryAmount, runningTotal: state.runningTotal + deliveryAmount };
  },

  tax: (state, quote) => {
    const { basis, derivation, rate, divisor } = quote.jurisdictionProfile.tax;
    if (basis === 'inclusive' && derivation === 'divisor') {
      const d = divisor ?? (1 + rate) / rate;
      return { ...state, taxAmount: state.runningTotal / d, grandTotal: state.runningTotal };
    }
    const taxAmount = state.runningTotal * rate;
    return { ...state, taxAmount, grandTotal: state.runningTotal + taxAmount };
  },

  rounding: (state, quote) => {
    const precision = quote.jurisdictionProfile.rounding.precision;
    return {
      ...state,
      lineSubtotal: roundHalfUp(state.lineSubtotal, precision),
      lineDiscountTotal: roundHalfUp(state.lineDiscountTotal, precision),
      orderDiscountAmount: roundHalfUp(state.orderDiscountAmount, precision),
      deliveryAmount: roundHalfUp(state.deliveryAmount, precision),
      taxAmount: roundHalfUp(state.taxAmount, precision),
      grandTotal: roundHalfUp(state.grandTotal, precision),
    };
  },
};

export function calculateQuote(quote: Quote): QuoteResult {
  const profile = quote.jurisdictionProfile;

  let state = INITIAL_STATE;
  for (const step of profile.calculationOrder) {
    const fn = STEPS[step];
    if (!fn) throw new Error(`Unknown calculation step "${step}" in profile ${profile.jurisdiction}`);
    state = fn(state, quote);
  }

  const documentType = profile.documentTypes.find((dt) => dt.key === quote.documentTypeKey);
  if (!documentType) {
    throw new Error(`Unknown document type "${quote.documentTypeKey}" for jurisdiction ${profile.jurisdiction}`);
  }

  const totals: ComputedTotals = {
    lineSubtotal: state.lineSubtotal,
    lineDiscountTotal: state.lineDiscountTotal,
    orderDiscountAmount: state.orderDiscountAmount,
    deliveryAmount: state.deliveryAmount,
    taxAmount: state.taxAmount,
    grandTotal: state.grandTotal,
  };

  return {
    totals,
    labels: generateLabels(profile),
    documentType,
    amountInWords: profile.numerals.wordsRequired ? amountInWords(state.grandTotal, profile) : null,
  };
}
