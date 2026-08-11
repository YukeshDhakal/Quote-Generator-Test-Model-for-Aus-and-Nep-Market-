import type { DatabaseSync } from 'node:sqlite';

const DOCUMENT_TYPE_CODES: Record<string, string> = {
  quote: 'QU',
  quotation: 'QU',
  estimate: 'ES',
};

/**
 * Sequential, gapless, jurisdiction-prefixed numbering (PRD FR-13, AUQU0086 pattern), scoped
 * per business and per fiscal year so two tenants both quoting in AU don't collide or leak
 * sequence info to each other, and each new financial year starts back at 0001. The fiscal-year
 * tag is baked into the returned number (e.g. AUQU2627-0001) so a quote number alone tells you
 * which year it's from. Wrapped in BEGIN IMMEDIATE/COMMIT so concurrent requests never hand out
 * the same number.
 */
export function nextQuoteNumber(
  db: DatabaseSync,
  businessId: string,
  jurisdiction: string,
  documentTypeKey: string,
  fiscalYear: string,
): string {
  const code = DOCUMENT_TYPE_CODES[documentTypeKey] ?? documentTypeKey.slice(0, 2).toUpperCase();

  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db
      .prepare(
        'SELECT next_seq FROM quote_number_counters WHERE business_id = ? AND jurisdiction = ? AND document_type_key = ? AND fiscal_year = ?',
      )
      .get(businessId, jurisdiction, documentTypeKey, fiscalYear) as { next_seq: number } | undefined;

    const seq = row?.next_seq ?? 1;

    if (row) {
      db.prepare(
        'UPDATE quote_number_counters SET next_seq = ? WHERE business_id = ? AND jurisdiction = ? AND document_type_key = ? AND fiscal_year = ?',
      ).run(seq + 1, businessId, jurisdiction, documentTypeKey, fiscalYear);
    } else {
      db.prepare(
        'INSERT INTO quote_number_counters (business_id, jurisdiction, document_type_key, fiscal_year, next_seq) VALUES (?, ?, ?, ?, ?)',
      ).run(businessId, jurisdiction, documentTypeKey, fiscalYear, seq + 1);
    }

    db.exec('COMMIT');
    return `${jurisdiction}${code}${fiscalYear}-${String(seq).padStart(4, '0')}`;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/** Read-only preview of what nextQuoteNumber() would return next, without allocating it. */
export function peekNextQuoteNumber(
  db: DatabaseSync,
  businessId: string,
  jurisdiction: string,
  documentTypeKey: string,
  fiscalYear: string,
): string {
  const code = DOCUMENT_TYPE_CODES[documentTypeKey] ?? documentTypeKey.slice(0, 2).toUpperCase();
  const row = db
    .prepare(
      'SELECT next_seq FROM quote_number_counters WHERE business_id = ? AND jurisdiction = ? AND document_type_key = ? AND fiscal_year = ?',
    )
    .get(businessId, jurisdiction, documentTypeKey, fiscalYear) as { next_seq: number } | undefined;
  const seq = row?.next_seq ?? 1;
  return `${jurisdiction}${code}${fiscalYear}-${String(seq).padStart(4, '0')}`;
}
