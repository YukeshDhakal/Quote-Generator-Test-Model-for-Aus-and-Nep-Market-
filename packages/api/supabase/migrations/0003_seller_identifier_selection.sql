-- Business identifier consolidation: a business now picks WHICH identifier type applies to it
-- (e.g. Nepal's PAN vs VAT Registration No.) rather than the app rendering every type at once.
-- Both columns are additive/nullable - existing rows are unaffected, no backfill needed.
-- Run once via the Supabase SQL Editor against both quoteengine-dev and quoteengine-prod.
--
-- Applied to quoteengine-dev at the time this was written. quoteengine-prod turned out to be
-- missing THIS migration too (not just 0002) - confirmed via list_tables before applying.
-- Both 0002 and 0003 applied to quoteengine-prod on 2026-08-16; both projects are caught up.

ALTER TABLE business_settings ADD COLUMN identifier_type TEXT;
ALTER TABLE requests ADD COLUMN customer_identifier TEXT;
