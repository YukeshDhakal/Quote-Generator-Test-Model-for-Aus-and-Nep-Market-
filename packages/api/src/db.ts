import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, 'quote-engine.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_settings (
    business_id TEXT PRIMARY KEY REFERENCES businesses(id),
    jurisdiction TEXT,
    legal_name TEXT,
    logo_path TEXT,
    color TEXT,
    terms_text TEXT,
    identifiers_json TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id),
    customer_name TEXT NOT NULL,
    company_name TEXT,
    delivery_address TEXT,
    billing_address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL REFERENCES businesses(id),
    request_id TEXT NOT NULL REFERENCES requests(id),
    quote_number TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    jurisdiction_profile_version INTEGER NOT NULL,
    jurisdiction_profile_json TEXT NOT NULL,
    document_type_key TEXT NOT NULL,
    split_value TEXT,
    quote_date TEXT NOT NULL,
    order_discount_type TEXT,
    order_discount_value REAL,
    delivery_mode TEXT,
    delivery_amount REAL,
    pdf_path TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (business_id, quote_number)
  );

  CREATE TABLE IF NOT EXISTS line_items (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id),
    product_code TEXT,
    description TEXT NOT NULL,
    qty REAL NOT NULL,
    unit_price REAL NOT NULL,
    taxable INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

`);

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('business_settings', 'jurisdiction', 'TEXT');

/**
 * quote_number_counters is keyed by fiscal year so numbering resets each financial year
 * instead of counting up forever. A pre-fiscal-year table (no fiscal_year column) is dropped
 * rather than migrated in place: a fresh fiscal-year bucket always starts at seq 1 by design,
 * so there's nothing worth carrying over, and already-issued quote numbers live in the
 * `quotes` table itself — untouched by this.
 */
function ensureQuoteNumberCountersTable() {
  const columns = db.prepare(`PRAGMA table_info(quote_number_counters)`).all() as { name: string }[];
  if (columns.length > 0 && !columns.some((c) => c.name === 'fiscal_year')) {
    db.exec('DROP TABLE quote_number_counters');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS quote_number_counters (
      business_id TEXT NOT NULL REFERENCES businesses(id),
      jurisdiction TEXT NOT NULL,
      document_type_key TEXT NOT NULL,
      fiscal_year TEXT NOT NULL,
      next_seq INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (business_id, jurisdiction, document_type_key, fiscal_year)
    );
  `);
}

ensureQuoteNumberCountersTable();
