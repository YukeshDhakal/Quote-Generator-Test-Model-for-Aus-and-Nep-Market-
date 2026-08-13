-- Initial schema for quote-engine, translated from the node:sqlite schema previously defined in
-- packages/api/src/db.ts. Run once via the Supabase SQL Editor (or `supabase db push`) against
-- both quoteengine-dev and quoteengine-prod.
--
-- Type notes:
--   TEXT / INTEGER map unchanged from SQLite.
--   REAL -> DOUBLE PRECISION (not NUMERIC): node-postgres returns NUMERIC as JS strings by
--     default, which would silently break every arithmetic call site in packages/engine that
--     expects plain numbers. DOUBLE PRECISION returns real JS numbers and reproduces SQLite
--     REAL's existing float semantics.
--   line_items.taxable INTEGER -> BOOLEAN (was manually converted 0/1 <-> boolean at the JS
--     boundary in server.ts; that conversion is removed now that the column is a real boolean).
--
-- No runtime "ensureColumn"/migration-on-boot equivalent is needed here — jurisdiction and
-- fiscal_year are just part of the tables from creation.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE business_settings (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id),
  jurisdiction TEXT,
  legal_name TEXT,
  logo_path TEXT,
  color TEXT,
  terms_text TEXT,
  identifiers_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  customer_name TEXT NOT NULL,
  company_name TEXT,
  delivery_address TEXT,
  billing_address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE quotes (
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
  order_discount_value DOUBLE PRECISION,
  delivery_mode TEXT,
  delivery_amount DOUBLE PRECISION,
  pdf_path TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (business_id, quote_number)
);

CREATE TABLE line_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  product_code TEXT,
  description TEXT NOT NULL,
  qty DOUBLE PRECISION NOT NULL,
  unit_price DOUBLE PRECISION NOT NULL,
  taxable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quote_number_counters (
  business_id TEXT NOT NULL REFERENCES businesses(id),
  jurisdiction TEXT NOT NULL,
  document_type_key TEXT NOT NULL,
  fiscal_year TEXT NOT NULL,
  next_seq INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (business_id, jurisdiction, document_type_key, fiscal_year)
);

-- Postgres doesn't auto-index FK columns the way SQLite's embedded-file reads made moot. Every
-- quotes/requests query filters by business_id, and loadQuote() runs in a per-row N+1 loop in
-- several list endpoints (server.ts) - each of those now costs a real network round-trip instead
-- of an in-process file read, so these indexes matter more post-migration than pre-migration.
CREATE INDEX idx_businesses_owner ON businesses(owner_user_id);
CREATE INDEX idx_requests_business ON requests(business_id);
CREATE INDEX idx_quotes_business ON quotes(business_id);
CREATE INDEX idx_quotes_request ON quotes(request_id);
CREATE INDEX idx_line_items_quote ON line_items(quote_id);
