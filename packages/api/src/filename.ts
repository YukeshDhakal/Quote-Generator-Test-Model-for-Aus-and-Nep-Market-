const FORBIDDEN = /[/\\:*?"<>|]/g;

export function sanitizeFilenameSegment(value: string): string {
  return value.replace(FORBIDDEN, '').trim();
}

export function quotePdfFilename(quoteNumber: string, customerCompany: string | null): string {
  const company = customerCompany ? sanitizeFilenameSegment(customerCompany) : '';
  const base = company ? `${sanitizeFilenameSegment(quoteNumber)}-${company}` : sanitizeFilenameSegment(quoteNumber);
  return `${base || 'quote'}.pdf`;
}
