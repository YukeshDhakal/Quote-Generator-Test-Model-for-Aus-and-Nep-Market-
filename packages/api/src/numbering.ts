import type { Pool, PoolClient } from 'pg';

type Queryable = Pool | PoolClient;

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
 * which year it's from.
 *
 * Single atomic upsert instead of a separate SELECT-then-UPDATE/INSERT — `next_seq` always means
 * "next available", so `RETURNING next_seq - 1` (not `next_seq`) is what hands out the seq that
 * was actually free, whether this is the first quote for this bucket (fresh insert) or not (the
 * conflict branch). Callers should pass the *same* transaction client used to insert the quote
 * itself (see server.ts), so a failed quote insert rolls the allocation back too instead of
 * burning a gap in the sequence.
 */
export async function nextQuoteNumber(
  db: Queryable,
  businessId: string,
  jurisdiction: string,
  documentTypeKey: string,
  fiscalYear: string,
): Promise<string> {
  const code = DOCUMENT_TYPE_CODES[documentTypeKey] ?? documentTypeKey.slice(0, 2).toUpperCase();

  const { rows } = await db.query(
    `INSERT INTO quote_number_counters (business_id, jurisdiction, document_type_key, fiscal_year, next_seq)
     VALUES ($1, $2, $3, $4, 2)
     ON CONFLICT (business_id, jurisdiction, document_type_key, fiscal_year)
     DO UPDATE SET next_seq = quote_number_counters.next_seq + 1
     RETURNING next_seq - 1 AS seq`,
    [businessId, jurisdiction, documentTypeKey, fiscalYear],
  );
  const seq = rows[0].seq as number;

  return `${jurisdiction}${code}${fiscalYear}-${String(seq).padStart(4, '0')}`;
}

/** Read-only preview of what nextQuoteNumber() would return next, without allocating it. */
export async function peekNextQuoteNumber(
  db: Queryable,
  businessId: string,
  jurisdiction: string,
  documentTypeKey: string,
  fiscalYear: string,
): Promise<string> {
  const code = DOCUMENT_TYPE_CODES[documentTypeKey] ?? documentTypeKey.slice(0, 2).toUpperCase();
  const { rows } = await db.query(
    `SELECT next_seq FROM quote_number_counters
     WHERE business_id = $1 AND jurisdiction = $2 AND document_type_key = $3 AND fiscal_year = $4`,
    [businessId, jurisdiction, documentTypeKey, fiscalYear],
  );
  const seq = rows[0]?.next_seq ?? 1;
  return `${jurisdiction}${code}${fiscalYear}-${String(seq).padStart(4, '0')}`;
}
