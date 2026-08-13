import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const uploadsDir = join(__dirname, '..', 'data', 'uploads');
mkdirSync(uploadsDir, { recursive: true });

export interface BusinessSettings {
  /** The single jurisdiction this business is registered/operates in. Null until set — a business can't create quotes until it picks one. Not editable once quotes exist under it in practice, though nothing currently enforces that. */
  jurisdiction: string | null;
  legalName: string | null;
  logoPath: string | null;
  color: string | null;
  termsText: string | null;
  /** Seller identifier values keyed by JurisdictionProfile.sellerIdentifiers[].key, e.g. { ABN: "51 824 753 556", PAN: "123456789" }. */
  identifiers: Record<string, string>;
}

interface BusinessRow {
  business_id: string;
  jurisdiction: string | null;
  legal_name: string | null;
  logo_path: string | null;
  color: string | null;
  terms_text: string | null;
  identifiers_json: string | null;
  updated_at: string;
}

const EMPTY: BusinessSettings = {
  jurisdiction: null,
  legalName: null,
  logoPath: null,
  color: null,
  termsText: null,
  identifiers: {},
};

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const { rows } = await pool.query<BusinessRow>('SELECT * FROM business_settings WHERE business_id = $1', [
    businessId,
  ]);
  const row = rows[0];

  if (!row) return EMPTY;

  return {
    jurisdiction: row.jurisdiction,
    legalName: row.legal_name,
    logoPath: row.logo_path,
    color: row.color,
    termsText: row.terms_text,
    identifiers: row.identifiers_json ? JSON.parse(row.identifiers_json) : {},
  };
}

export async function saveBusinessSettings(
  businessId: string,
  patch: Partial<BusinessSettings>,
): Promise<BusinessSettings> {
  const current = await getBusinessSettings(businessId);
  const next: BusinessSettings = {
    ...current,
    ...patch,
    identifiers: { ...current.identifiers, ...(patch.identifiers ?? {}) },
  };

  await pool.query(
    `INSERT INTO business_settings (business_id, jurisdiction, legal_name, logo_path, color, terms_text, identifiers_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (business_id) DO UPDATE SET
       jurisdiction = excluded.jurisdiction,
       legal_name = excluded.legal_name,
       logo_path = excluded.logo_path,
       color = excluded.color,
       terms_text = excluded.terms_text,
       identifiers_json = excluded.identifiers_json,
       updated_at = excluded.updated_at`,
    [
      businessId,
      next.jurisdiction,
      next.legalName,
      next.logoPath,
      next.color,
      next.termsText,
      JSON.stringify(next.identifiers),
      new Date().toISOString(),
    ],
  );

  return next;
}
