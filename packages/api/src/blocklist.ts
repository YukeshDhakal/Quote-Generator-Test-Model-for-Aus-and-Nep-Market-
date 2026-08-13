// This product issues quotes only - never invoice, bill, or payment, anywhere this app
// authors text itself (filenames, subject/body defaults, UI labels, history copy). This is a
// legal boundary, not a style preference. Does NOT apply to what an operator freely types into
// the editable subject/body - see mail.ts / server.ts send-gmail route for that reasoning.
export const BLOCKLISTED_TERMS = ['invoice', 'bill', 'payment'];

export function findBlocklistedTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return BLOCKLISTED_TERMS.filter((term) => lower.includes(term));
}
