-- Business identifier consolidation: a business now picks WHICH identifier type applies to it
-- (e.g. Nepal's PAN vs VAT Registration No.) rather than the app rendering every type at once.
-- Both columns are additive/nullable - existing rows are unaffected, no backfill needed.
-- Run once via the Supabase SQL Editor against both quoteengine-dev and quoteengine-prod.
--
-- NOTE: per 0002_quote_delivery.sql's own header, that migration was only ever applied to
-- quoteengine-dev, not prod - confirm which migrations prod is actually missing before running
-- this one, rather than assuming prod is caught up through 0002.

ALTER TABLE business_settings ADD COLUMN identifier_type TEXT;
ALTER TABLE requests ADD COLUMN customer_identifier TEXT;
