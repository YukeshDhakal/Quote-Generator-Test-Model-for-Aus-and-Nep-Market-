-- Quote delivery feature: Download PDF (already existed) + Send via Gmail (new).
-- Applied to quoteengine-dev at the time this was written, then NOT promoted to
-- quoteengine-prod for weeks - the Gmail-send feature was later wired up and turned on in prod
-- (secrets set, MAIL_MODE=gmail) without this migration ever running there, causing
-- "relation gmail_connections/send_events does not exist" 500s in production. Applied to
-- quoteengine-prod on 2026-08-16 to fix that. Both projects are now caught up through 0002.

ALTER TABLE requests ADD COLUMN customer_email TEXT;

-- One connection per business (this app's tenancy unit throughout), not per user - the sent-from
-- Gmail account belongs to the business regardless of which staff member connected it.
--
-- No email/identity column: gmail.send scope alone cannot read the connected account's profile
-- or email address (confirmed live - Gmail's users.getProfile 403s under gmail.send-only
-- consent), and requesting an additional scope (openid/email) just to learn it would violate the
-- "gmail.send ONLY" requirement. Gmail auto-fills the From header from the authenticated account
-- when the raw message omits it, so this isn't needed for sending either.
CREATE TABLE gmail_connections (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id),
  refresh_token_encrypted TEXT NOT NULL,
  scope TEXT NOT NULL,
  connected_by_user_id TEXT NOT NULL REFERENCES users(id),
  connected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- method/outcome get CHECK constraints (unlike every other TEXT column in this schema) because
-- outcome is the field most directly tied to the "never say delivered" legal boundary - cheap
-- insurance specifically here, not a general convention change.
CREATE TABLE send_events (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  method TEXT NOT NULL CHECK (method IN ('manual', 'gmail')),
  recipient_email TEXT,
  sent_by TEXT NOT NULL REFERENCES users(id),
  sent_at TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('downloaded', 'marked_sent', 'accepted', 'failed')),
  gmail_message_id TEXT,
  error_detail TEXT
);
CREATE INDEX idx_send_events_quote ON send_events(quote_id);
CREATE INDEX idx_send_events_business ON send_events(business_id);
