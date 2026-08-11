export type TaxBasis = 'inclusive' | 'exclusive';
export type TaxDerivation = 'divisor' | 'additive';

export type CalculationStep =
  | 'line_subtotal'
  | 'line_discount'
  | 'order_discount'
  | 'delivery'
  | 'tax'
  | 'rounding';

export type RoundingMode = 'half_up';
export type RoundingStage = 'line' | 'total';
export type CalendarSystem = 'gregorian' | 'bikram_sambat';
export type NumeralGrouping = 'western' | 'lakh_crore';
export type TaxableMarking = 'none' | 'asterisk';

export interface SellerIdentifier {
  key: string;
  label: string;
  required: boolean;
  position: string;
}

export interface DocumentTypeDef {
  key: string;
  title: string;
  showTax: boolean;
}

export interface JurisdictionProfile {
  jurisdiction: string;
  version: number;
  currency: {
    code: string;
    symbol: string;
    minorUnit: string;
    decimals: number;
  };
  tax: {
    label: string;
    rate: number;
    basis: TaxBasis;
    derivation: TaxDerivation;
    divisor: number | null;
    exemptCategories: string[];
  };
  calculationOrder: CalculationStep[];
  rounding: {
    mode: RoundingMode;
    precision: number;
    applyAt: RoundingStage;
  };
  calendar: {
    system: CalendarSystem;
    format: string;
  };
  /** Financial year start, expressed in this jurisdiction's own calendar (e.g. month 7 = July for AU, month 4 = Shrawan for NP). */
  financialYear: {
    startMonth: number;
    startDay: number;
  };
  numerals: {
    grouping: NumeralGrouping;
    wordsRequired: boolean;
    wordsLocale: string | null;
  };
  sellerIdentifiers: SellerIdentifier[];
  documentTypes: DocumentTypeDef[];
  lineItemColumns: string[];
  taxableMarking: TaxableMarking;
  validityDays: number | null;
}

export type Discount =
  | { type: 'percent'; value: number }
  | { type: 'fixed'; value: number };

export interface LineItem {
  productCode: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxable: boolean;
  lineDiscount?: Discount;
}

export interface Delivery {
  mode: 'flat' | 'per_quantity';
  amount: number;
}

export interface Quote {
  quoteNumber: string;
  date: string;
  documentTypeKey: string;
  lineItems: LineItem[];
  orderDiscount?: Discount;
  delivery?: Delivery;
  jurisdictionProfile: JurisdictionProfile;
}

export interface ComputedTotals {
  lineSubtotal: number;
  lineDiscountTotal: number;
  orderDiscountAmount: number;
  deliveryAmount: number;
  taxAmount: number;
  grandTotal: number;
}

export interface GeneratedLabels {
  subtotalLabel: string;
  taxLabel: string;
  grandTotalLabel: string;
}

export interface QuoteResult {
  totals: ComputedTotals;
  labels: GeneratedLabels;
  documentType: DocumentTypeDef;
  amountInWords: string | null;
}
