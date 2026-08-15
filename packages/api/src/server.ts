import 'express-async-errors';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import {
  AU_PROFILE,
  NP_PROFILE,
  calculateQuote,
  compareProfileDates,
  financialYearTag,
  isWithinProfileDateRange,
  type Discount,
  type JurisdictionProfile,
  type LineItem,
  type Quote,
} from '@quote-engine/engine';
import {
  createBusinessForUser,
  createUserWithBusiness,
  deleteGmailConnection,
  exchangeGmailCode,
  findBusinessById,
  findBusinessForOwner,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  getGmailAccessToken,
  getGmailConnection,
  gmailAuthorizeUrl,
  GmailReauthRequiredError,
  hashPassword,
  isBusinessOwnedByUser,
  isGoogleSignInConfigured,
  isGmailSendConfigured,
  linkGoogleIdToUser,
  listBusinessesForOwner,
  saveGmailConnection,
  sessionCookieName,
  sessionCookieOptions,
  clearSessionCookieOptions,
  signGmailOAuthState,
  signSession,
  verifyGmailOAuthState,
  verifyGoogleCredential,
  verifyPassword,
  verifySession,
} from './auth.js';
import { findBlocklistedTerms } from './blocklist.js';
import { getBusinessSettings, saveBusinessSettings, uploadsDir } from './business.js';
import { assertTokenEncryptionKeyValid } from './crypto.js';
import { pool, withTransaction } from './db.js';
import { extensionForImageType, sniffImageType } from './fileType.js';
import { quotePdfFilename } from './filename.js';
import { composeQuoteEmail, DEFAULT_BODY, sendComposedEmail } from './mail.js';
import { nextQuoteNumber, peekNextQuoteNumber } from './numbering.js';
import { todayInProfileCalendar } from './today.js';
import { buildQuoteHtml, renderQuotePdf } from './pdf.js';
import { rejectUnknownFields } from './validation.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      businessId?: string;
    }
  }
}

// Fail fast on boot rather than running with `undefined` and failing confusingly on first use.
// DATABASE_URL is unconditionally required - without it, pg's Pool silently falls back to
// PGHOST/PGUSER-style defaults (or localhost) instead of erroring, which could even mean quietly
// talking to the wrong database. GOOGLE_CLIENT_ID/SECRET stay optional by design (Google
// sign-in/Gmail send cleanly disable themselves when absent - see isGoogleSignInConfigured/
// isGmailSendConfigured), but if Gmail send IS configured, TOKEN_ENCRYPTION_KEY must be present
// and well-formed too, or every send would crash on the first real attempt instead of at boot.
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set. Copy packages/api/.env.example to .env and fill it in.');
  process.exit(1);
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  try {
    assertTokenEncryptionKeyValid();
  } catch (err) {
    console.error(
      `FATAL: Gmail send is configured (GOOGLE_CLIENT_ID/SECRET set) but TOKEN_ENCRYPTION_KEY is invalid: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}

const PROFILES: Record<string, JurisdictionProfile> = {
  AU: AU_PROFILE,
  NP: NP_PROFILE,
};

/** Rejects nonsensical discounts (e.g. a UI bug sending 5 meaning "5%" instead of 0.05) before they ever reach the calculation engine. */
function validateDiscount(discount: Discount | undefined | null): string | null {
  if (!discount) return null;
  if (discount.type === 'percent' && (discount.value < 0 || discount.value > 1)) {
    return 'Percent discount value must be between 0 and 1 (e.g. 0.05 for 5%)';
  }
  if (discount.type === 'fixed' && discount.value < 0) {
    return 'Fixed discount value must not be negative';
  }
  return null;
}

// Comma-separated so the old and new frontend domain can both be allowed during a domain
// migration - swapping this to a single value the moment a new domain is bought would break
// CORS for whichever origin is still actually live until the new domain is attached in Vercel.
const WEB_ORIGINS = (process.env.WEB_ORIGIN ?? 'http://localhost:5183').split(',').map((o) => o.trim());

// Regression guard, not a runtime request-path check: this app never labels a quote-adjacent
// action with these words in anything it authors itself (defaults, filenames, UI copy, history
// text) - a legal boundary, not style. Deliberately does NOT run against operator-typed
// subject/body (see send-gmail route) - a customer literally named "Bill" must never make a send fail.
for (const template of [DEFAULT_BODY, 'Your quote ']) {
  const hits = findBlocklistedTerms(template);
  if (hits.length > 0) {
    throw new Error(`App-authored email copy contains blocklisted term(s): ${hits.join(', ')}`);
  }
}

const app = express();
// Fly puts one reverse-proxy hop in front of this app; without trust proxy, express-rate-limit
// (and req.ip generally) would see every request as coming from the proxy's own address instead
// of the real client, either lumping all users into one shared limit or disabling limiting
// entirely. `1` trusts exactly that one hop's X-Forwarded-For entry, not the whole chain.
app.set('trust proxy', 1);
// Baseline security response headers - notably Strict-Transport-Security (HSTS), which the
// frontend already sends but this API didn't: without it, a browser that's ever reached this
// API over plain http:// (e.g. someone typing the bare domain) has no standing instruction to
// always upgrade to https:// on its own, leaving a window for a downgrade/strip attack even
// though force_https already redirects at the Fly proxy layer.
app.use(helmet());
app.use(cors({ origin: WEB_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Logos used to be served by express.static with no auth at all - any of the app's own filenames
// (logo-<businessId>.<ext>) would fetch cleanly from ANY browser, logged in or not, tenant or
// not. Filenames aren't brute-forceable (businessId is a random UUID) but that's obscurity, not
// access control. This route requires a session AND checks the filename's embedded businessId
// against the caller's own tenant before ever touching the filesystem - the regex also doubles
// as a path-traversal guard, since anything that isn't exactly `logo-<no dots/slashes>.<ext>`
// (in particular anything containing `..` or `/`) is rejected before join(uploadsDir, ...) runs.
app.get('/uploads/:filename', requireAuth, (req, res) => {
  const match = /^logo-([^./\\]+)(\.(?:png|jpg|webp|svg))$/.exec(req.params.filename);
  if (!match || match[1] !== req.businessId) {
    return res.status(404).json({ error: 'not found' });
  }
  res.sendFile(join(uploadsDir, req.params.filename), (err) => {
    if (err) res.status(404).json({ error: 'not found' });
  });
});

// Applies to every /api/* route as a baseline defense against scraping/abuse - generous enough
// (300 req/15min per IP) that no legitimate usage pattern in this app should ever hit it.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Tighter limit for signup/Google sign-in - these create accounts/consume the Google
// verification API, so they get a stricter cap than general API traffic.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

// Login is the actual brute-force target, so this is the strictest limiter and only counts
// FAILED attempts (skipSuccessfulRequests) - a legitimate user who mistypes their password once
// or twice before succeeding shouldn't eat into the same budget an attacker's guesses would.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// memoryStorage, not diskStorage: the client's Content-Type header and the uploaded filename's
// extension are both attacker-controlled and don't have to match the actual bytes, so nothing
// client-supplied is trusted for either the accept/reject decision or the on-disk filename -
// see the sniffImageType() content check in the /api/business/logo route below, which is the
// real gate. Buffering the whole file is fine at a 2MB cap.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[sessionCookieName];
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  req.userId = session.userId;
  req.businessId = session.businessId;
  next();
}

function setSessionCookie(res: Response, userId: string, businessId: string) {
  res.cookie(sessionCookieName, signSession({ userId, businessId }), sessionCookieOptions);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['email', 'password', 'name', 'businessName', 'jurisdiction']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { email, password, name, businessName, jurisdiction } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }
  if (jurisdiction && !PROFILES[jurisdiction]) {
    return res.status(400).json({ error: `unknown jurisdiction "${jurisdiction}"` });
  }
  if (await findUserByEmail(email)) {
    return res.status(409).json({ error: 'an account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const { user, business } = await createUserWithBusiness({
    email,
    name: name ?? null,
    passwordHash,
    businessName: businessName || `${name || email.split('@')[0]}'s Business`,
    jurisdiction: jurisdiction ?? null,
  });

  setSessionCookie(res, user.id, business.id);
  res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, business });
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['email', 'password']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { email, password } = req.body ?? {};
  const user = email ? await findUserByEmail(email) : undefined;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
  const valid = await verifyPassword(password ?? '', user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  const business = await findBusinessForOwner(user.id);
  if (!business) {
    return res.status(500).json({ error: 'account has no business associated' });
  }

  setSessionCookie(res, user.id, business.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, business });
});

app.get('/api/auth/google/config', (_req, res) => {
  res.json({ configured: isGoogleSignInConfigured(), clientId: process.env.GOOGLE_CLIENT_ID ?? null });
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['credential']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { credential } = req.body ?? {};
  if (!credential) {
    return res.status(400).json({ error: 'credential is required' });
  }

  let payload: { sub: string; email: string; name?: string };
  try {
    payload = await verifyGoogleCredential(credential);
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : 'invalid Google credential' });
  }

  let user = await findUserByGoogleId(payload.sub);

  if (!user) {
    const existingByEmail = await findUserByEmail(payload.email);
    if (existingByEmail) {
      await linkGoogleIdToUser(existingByEmail.id, payload.sub);
      user = { ...existingByEmail, google_id: payload.sub };
    } else {
      const created = await createUserWithBusiness({
        email: payload.email,
        name: payload.name ?? null,
        googleId: payload.sub,
        businessName: `${payload.name || payload.email.split('@')[0]}'s Business`,
      });
      user = created.user;
    }
  }

  const business = await findBusinessForOwner(user.id);
  if (!business) {
    return res.status(500).json({ error: 'account has no business associated' });
  }

  setSessionCookie(res, user.id, business.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name }, business });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(sessionCookieName, clearSessionCookieOptions);
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await findUserById(req.userId!);
  const business = await findBusinessById(req.businessId!);
  if (!user || !business) return res.status(401).json({ error: 'not authenticated' });
  res.json({ user: { id: user.id, email: user.email, name: user.name }, business });
});

app.get('/api/auth/businesses', requireAuth, async (req, res) => {
  const owned = await listBusinessesForOwner(req.userId!);
  const businesses = await Promise.all(
    owned.map(async (b) => ({
      ...b,
      jurisdiction: (await getBusinessSettings(b.id)).jurisdiction,
      active: b.id === req.businessId,
    })),
  );
  res.json(businesses);
});

app.post('/api/auth/businesses', requireAuth, async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['name', 'jurisdiction']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { name, jurisdiction } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!jurisdiction || !PROFILES[jurisdiction]) {
    return res.status(400).json({ error: `unknown jurisdiction "${jurisdiction}"` });
  }

  const business = await createBusinessForUser(req.userId!, name, jurisdiction);
  setSessionCookie(res, req.userId!, business.id);
  res.status(201).json(business);
});

app.post('/api/auth/switch-business', requireAuth, async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['businessId']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { businessId } = req.body ?? {};
  if (!businessId || !(await isBusinessOwnedByUser(businessId, req.userId!))) {
    return res.status(403).json({ error: 'not your business' });
  }
  setSessionCookie(res, req.userId!, businessId);
  const business = await findBusinessById(businessId);
  res.json({ business });
});

// ---------------------------------------------------------------------------
// Requests / Quotes (business-scoped)
// ---------------------------------------------------------------------------

interface RequestRow {
  id: string;
  business_id: string;
  customer_name: string;
  company_name: string | null;
  customer_email: string | null;
  delivery_address: string | null;
  billing_address: string | null;
  created_at: string;
}

interface QuoteRow {
  id: string;
  business_id: string;
  request_id: string;
  quote_number: string;
  jurisdiction: string;
  jurisdiction_profile_version: number;
  jurisdiction_profile_json: string;
  document_type_key: string;
  split_value: string | null;
  quote_date: string;
  order_discount_type: string | null;
  order_discount_value: number | null;
  delivery_mode: string | null;
  delivery_amount: number | null;
  created_at: string;
}

interface LineItemRow {
  id: string;
  quote_id: string;
  product_code: string | null;
  description: string;
  qty: number;
  unit_price: number;
  taxable: boolean;
  sort_order: number;
}

async function loadQuote(businessId: string, quoteId: string) {
  const { rows: quoteRows } = await pool.query<QuoteRow>('SELECT * FROM quotes WHERE id = $1 AND business_id = $2', [
    quoteId,
    businessId,
  ]);
  const quoteRow = quoteRows[0];
  if (!quoteRow) return null;

  const { rows: requestRows } = await pool.query<RequestRow>('SELECT * FROM requests WHERE id = $1', [
    quoteRow.request_id,
  ]);
  const requestRow = requestRows[0];

  const { rows: lineItemRows } = await pool.query<LineItemRow>(
    'SELECT * FROM line_items WHERE quote_id = $1 ORDER BY sort_order',
    [quoteId],
  );

  const lineItems: LineItem[] = lineItemRows.map((row) => ({
    productCode: row.product_code ?? '',
    description: row.description,
    qty: row.qty,
    unitPrice: row.unit_price,
    taxable: row.taxable,
  }));

  const orderDiscount: Discount | undefined = quoteRow.order_discount_type
    ? ({ type: quoteRow.order_discount_type, value: quoteRow.order_discount_value! } as Discount)
    : undefined;

  const delivery = quoteRow.delivery_mode
    ? { mode: quoteRow.delivery_mode as 'flat' | 'per_quantity', amount: quoteRow.delivery_amount! }
    : undefined;

  const profile: JurisdictionProfile = JSON.parse(quoteRow.jurisdiction_profile_json);

  const quote: Quote = {
    quoteNumber: quoteRow.quote_number,
    date: quoteRow.quote_date,
    documentTypeKey: quoteRow.document_type_key,
    lineItems,
    orderDiscount,
    delivery,
    jurisdictionProfile: profile,
  };

  const result = calculateQuote(quote);
  const customer = requestRow
    ? {
        customerName: requestRow.customer_name,
        companyName: requestRow.company_name,
        customerEmail: requestRow.customer_email,
        deliveryAddress: requestRow.delivery_address,
        billingAddress: requestRow.billing_address,
      }
    : null;

  return { quoteRow, quote, result, customer };
}

app.use('/api/requests', requireAuth);
app.use('/api/quotes', requireAuth);
app.use('/api/business', requireAuth);
app.use('/api/dashboard', requireAuth);

app.post('/api/requests', async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, [
    'customerName',
    'companyName',
    'customerEmail',
    'deliveryAddress',
    'billingAddress',
  ]);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { customerName, companyName, customerEmail, deliveryAddress, billingAddress } = req.body ?? {};
  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  const id = randomUUID();
  await pool.query(
    `INSERT INTO requests (id, business_id, customer_name, company_name, customer_email, delivery_address, billing_address, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      req.businessId!,
      customerName,
      companyName ?? null,
      customerEmail ?? null,
      deliveryAddress ?? null,
      billingAddress ?? null,
      new Date().toISOString(),
    ],
  );

  res.status(201).json({ id, customerName, companyName, customerEmail, deliveryAddress, billingAddress });
});

app.put('/api/requests/:id', async (req, res) => {
  const { rows } = await pool.query<RequestRow>('SELECT * FROM requests WHERE id = $1 AND business_id = $2', [
    req.params.id,
    req.businessId!,
  ]);
  if (!rows[0]) return res.status(404).json({ error: 'request not found' });

  const unknownFields = rejectUnknownFields(req.body, [
    'customerName',
    'companyName',
    'customerEmail',
    'deliveryAddress',
    'billingAddress',
  ]);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { customerName, companyName, customerEmail, deliveryAddress, billingAddress } = req.body ?? {};
  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  await pool.query(
    `UPDATE requests SET customer_name = $1, company_name = $2, customer_email = $3, delivery_address = $4, billing_address = $5
     WHERE id = $6 AND business_id = $7`,
    [
      customerName,
      companyName ?? null,
      customerEmail ?? null,
      deliveryAddress ?? null,
      billingAddress ?? null,
      req.params.id,
      req.businessId!,
    ],
  );

  res.json({
    id: req.params.id,
    customerName,
    companyName: companyName ?? null,
    customerEmail: customerEmail ?? null,
    deliveryAddress: deliveryAddress ?? null,
    billingAddress: billingAddress ?? null,
  });
});

app.get('/api/requests', async (req, res) => {
  const { rows } = await pool.query<RequestRow>('SELECT * FROM requests WHERE business_id = $1 ORDER BY created_at DESC', [
    req.businessId!,
  ]);
  const withQuoteCounts = await Promise.all(
    rows.map(async (row) => {
      const { rows: countRows } = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM quotes WHERE request_id = $1',
        [row.id],
      );
      return {
        id: row.id,
        customerName: row.customer_name,
        companyName: row.company_name,
        customerEmail: row.customer_email,
        deliveryAddress: row.delivery_address,
        billingAddress: row.billing_address,
        createdAt: row.created_at,
        quoteCount: Number(countRows[0].count),
      };
    }),
  );
  res.json(withQuoteCounts);
});

app.post('/api/requests/:requestId/quotes', async (req, res) => {
  const { requestId } = req.params;
  const { rows: requestRows } = await pool.query<RequestRow>(
    'SELECT * FROM requests WHERE id = $1 AND business_id = $2',
    [requestId, req.businessId!],
  );
  const requestRow = requestRows[0];
  if (!requestRow) {
    return res.status(404).json({ error: 'request not found' });
  }

  const unknownFields = rejectUnknownFields(req.body, [
    'documentTypeKey',
    'date',
    'splitValue',
    'lineItems',
    'orderDiscount',
    'delivery',
  ]);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { documentTypeKey, date, splitValue, lineItems, orderDiscount, delivery } = req.body ?? {};

  // Jurisdiction is never taken from the client — it's the business's own locked jurisdiction,
  // set once in Business Settings. A business registered in one place can't quote as another.
  const jurisdiction = (await getBusinessSettings(req.businessId!)).jurisdiction;
  if (!jurisdiction) {
    return res
      .status(400)
      .json({ error: 'This business has no jurisdiction set yet. Set it in Business Settings before creating a quote.' });
  }
  const profile = PROFILES[jurisdiction];
  if (!profile) {
    return res.status(400).json({ error: `unknown jurisdiction "${jurisdiction}"` });
  }
  if (!profile.documentTypes.some((dt) => dt.key === documentTypeKey)) {
    return res.status(400).json({ error: `unknown document type "${documentTypeKey}" for ${jurisdiction}` });
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'at least one line item is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }
  const discountError = validateDiscount(orderDiscount);
  if (discountError) {
    return res.status(400).json({ error: discountError });
  }

  const quoteId = randomUUID();
  const fiscalYear = financialYearTag(profile, date);

  // Number allocation and quote/line-item insert share one transaction, so a failed insert rolls
  // the allocation back too instead of permanently burning a gap in the "gapless" sequence.
  await withTransaction(async (client) => {
    const quoteNumber = await nextQuoteNumber(client, req.businessId!, jurisdiction, documentTypeKey, fiscalYear);

    await client.query(
      `INSERT INTO quotes (
        id, business_id, request_id, quote_number, jurisdiction, jurisdiction_profile_version, jurisdiction_profile_json,
        document_type_key, split_value, quote_date, order_discount_type, order_discount_value,
        delivery_mode, delivery_amount, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        quoteId,
        req.businessId!,
        requestId,
        quoteNumber,
        jurisdiction,
        profile.version,
        JSON.stringify(profile),
        documentTypeKey,
        splitValue ?? null,
        date,
        orderDiscount?.type ?? null,
        orderDiscount?.value ?? null,
        delivery?.mode ?? null,
        delivery?.amount ?? null,
        new Date().toISOString(),
      ],
    );

    for (const [index, item] of (lineItems as LineItem[]).entries()) {
      await client.query(
        `INSERT INTO line_items (id, quote_id, product_code, description, qty, unit_price, taxable, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), quoteId, item.productCode ?? null, item.description, item.qty, item.unitPrice, item.taxable, index],
      );
    }
  });

  const loaded = await loadQuote(req.businessId!, quoteId);
  res.status(201).json(loaded);
});

app.get('/api/quotes/:id', async (req, res) => {
  const loaded = await loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });
  res.json(loaded);
});

app.put('/api/quotes/:id', async (req, res) => {
  const { rows } = await pool.query<QuoteRow>('SELECT * FROM quotes WHERE id = $1 AND business_id = $2', [
    req.params.id,
    req.businessId!,
  ]);
  const quoteRow = rows[0];
  if (!quoteRow) return res.status(404).json({ error: 'quote not found' });

  // Jurisdiction is not editable here — it's baked into the quote number's prefix, so changing
  // it would make the already-issued number wrong. Delete and re-create instead if that's needed.
  const profile: JurisdictionProfile = JSON.parse(quoteRow.jurisdiction_profile_json);
  const unknownFields = rejectUnknownFields(req.body, [
    'documentTypeKey',
    'date',
    'splitValue',
    'lineItems',
    'orderDiscount',
    'delivery',
  ]);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { documentTypeKey, date, splitValue, lineItems, orderDiscount, delivery } = req.body ?? {};

  if (!profile.documentTypes.some((dt) => dt.key === documentTypeKey)) {
    return res.status(400).json({ error: `unknown document type "${documentTypeKey}" for ${quoteRow.jurisdiction}` });
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({ error: 'at least one line item is required' });
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }
  const discountError = validateDiscount(orderDiscount);
  if (discountError) {
    return res.status(400).json({ error: discountError });
  }

  await withTransaction(async (client) => {
    // business_id is redundant here - the SELECT above already confirmed this quote belongs to
    // req.businessId - but the mutating statement filters on it directly too rather than relying
    // solely on the earlier check-then-act, so a future refactor can't silently reorder its way
    // into a cross-tenant write.
    await client.query(
      `UPDATE quotes SET
        document_type_key = $1, split_value = $2, quote_date = $3, order_discount_type = $4, order_discount_value = $5,
        delivery_mode = $6, delivery_amount = $7, pdf_path = NULL
       WHERE id = $8 AND business_id = $9`,
      [
        documentTypeKey,
        splitValue ?? null,
        date,
        orderDiscount?.type ?? null,
        orderDiscount?.value ?? null,
        delivery?.mode ?? null,
        delivery?.amount ?? null,
        req.params.id,
        req.businessId!,
      ],
    );

    // line_items has no business_id column of its own (child of quotes via quote_id) - scope the
    // delete through quotes.business_id directly rather than trusting quote_id alone.
    await client.query(
      `DELETE FROM line_items USING quotes
       WHERE line_items.quote_id = quotes.id AND line_items.quote_id = $1 AND quotes.business_id = $2`,
      [req.params.id, req.businessId!],
    );

    for (const [index, item] of (lineItems as LineItem[]).entries()) {
      await client.query(
        `INSERT INTO line_items (id, quote_id, product_code, description, qty, unit_price, taxable, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), req.params.id, item.productCode ?? null, item.description, item.qty, item.unitPrice, item.taxable, index],
      );
    }
  });

  const loaded = await loadQuote(req.businessId!, req.params.id);
  res.json(loaded);
});

app.get('/api/quotes', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

  // Both bounds are expressed in whatever jurisdiction's calendar the client resolved them in
  // (the business's own locked jurisdiction), so validate against that profile.
  if (from && to) {
    const businessJurisdiction = (await getBusinessSettings(req.businessId!)).jurisdiction;
    const profile = businessJurisdiction ? PROFILES[businessJurisdiction] : null;
    const cmp = profile ? compareProfileDates(profile, from, to) : null;
    if (cmp !== null && cmp > 0) {
      return res.status(400).json({ error: '"to" date must not be before "from" date' });
    }
  }

  const { rows } = search
    ? await pool.query<QuoteRow & { customer_name: string; company_name: string | null }>(
        `SELECT q.*, r.customer_name, r.company_name FROM quotes q
         JOIN requests r ON r.id = q.request_id
         WHERE q.business_id = $1 AND (q.quote_number ILIKE $2 OR r.customer_name ILIKE $2)
         ORDER BY q.created_at DESC`,
        [req.businessId!, `%${search}%`],
      )
    : await pool.query<QuoteRow & { customer_name: string; company_name: string | null }>(
        `SELECT q.*, r.customer_name, r.company_name FROM quotes q
         JOIN requests r ON r.id = q.request_id
         WHERE q.business_id = $1
         ORDER BY q.created_at DESC`,
        [req.businessId!],
      );

  // Date-range filtering happens here, not in SQL: a quote's date is stored in its own
  // jurisdiction's format (e.g. AU's DD/MM/YYYY isn't lexicographically sortable), so each row
  // is compared using the profile for ITS OWN jurisdiction rather than one assumed format. This
  // AND-composes with the search filter above since it narrows the same row set further.
  const dateFiltered = !from && !to
    ? rows
    : rows.filter((row) => {
        const profile = PROFILES[row.jurisdiction];
        if (!profile) return false;
        return isWithinProfileDateRange(profile, row.quote_date, from, to);
      });

  const summaries = await Promise.all(
    dateFiltered.map(async (row) => {
      const loaded = (await loadQuote(req.businessId!, row.id))!;
      return {
        id: row.id,
        quoteNumber: row.quote_number,
        customerName: row.customer_name,
        companyName: row.company_name,
        jurisdiction: row.jurisdiction,
        documentTypeKey: row.document_type_key,
        documentTypeTitle: loaded.result.documentType.title,
        date: row.quote_date,
        grandTotal: loaded.result.totals.grandTotal,
      };
    }),
  );

  res.json(summaries);
});

app.get('/api/dashboard', async (req, res) => {
  const businessId = req.businessId!;
  const { rows: countRows } = await pool.query<{ quotecount: string }>(
    'SELECT COUNT(*) as quoteCount FROM quotes WHERE business_id = $1',
    [businessId],
  );
  const quoteCount = Number(countRows[0].quotecount);

  const { rows } = await pool.query<QuoteRow & { customer_name: string; company_name: string | null }>(
    `SELECT q.*, r.customer_name, r.company_name FROM quotes q
     JOIN requests r ON r.id = q.request_id
     WHERE q.business_id = $1
     ORDER BY q.created_at DESC
     LIMIT 5`,
    [businessId],
  );

  const recentQuotes = await Promise.all(
    rows.map(async (row) => {
      const loaded = (await loadQuote(businessId, row.id))!;
      return {
        id: row.id,
        quoteNumber: row.quote_number,
        customerName: row.customer_name,
        jurisdiction: row.jurisdiction,
        documentTypeTitle: loaded.result.documentType.title,
        date: row.quote_date,
        grandTotal: loaded.result.totals.grandTotal,
      };
    }),
  );

  const totalsByJurisdiction = await Promise.all(
    (['AU', 'NP'] as const).map(async (jurisdiction) => {
      const { rows: idRows } = await pool.query<{ id: string }>(
        'SELECT id FROM quotes WHERE business_id = $1 AND jurisdiction = $2',
        [businessId, jurisdiction],
      );
      const results = await Promise.all(idRows.map(async (r) => (await loadQuote(businessId, r.id))!.result.totals));
      const grandTotal = results.reduce((sum, t) => sum + t.grandTotal, 0);
      const taxTotal = results.reduce((sum, t) => sum + t.taxAmount, 0);
      return { jurisdiction, quoteCount: idRows.length, grandTotal, taxTotal, subtotal: grandTotal - taxTotal };
    }),
  );

  const businessJurisdiction = (await getBusinessSettings(businessId)).jurisdiction;
  const nextNumber =
    businessJurisdiction && PROFILES[businessJurisdiction]
      ? await peekNextQuoteNumber(
          pool,
          businessId,
          businessJurisdiction,
          PROFILES[businessJurisdiction].documentTypes[0].key,
          financialYearTag(PROFILES[businessJurisdiction], todayInProfileCalendar(PROFILES[businessJurisdiction])),
        )
      : null;

  res.json({ quoteCount, recentQuotes, totalsByJurisdiction, businessJurisdiction, nextNumber });
});

app.get('/api/business', async (req, res) => {
  res.json(await getBusinessSettings(req.businessId!));
});

app.put('/api/business', async (req, res) => {
  const unknownFields = rejectUnknownFields(req.body, ['jurisdiction', 'legalName', 'color', 'termsText', 'identifiers']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { jurisdiction, legalName, color, termsText, identifiers } = req.body ?? {};

  // Only touch jurisdiction if the caller actually sent it — omitting the key must never
  // silently wipe an already-set jurisdiction (see saveBusinessSettings' merge semantics).
  const patch: Parameters<typeof saveBusinessSettings>[1] = {
    legalName: legalName ?? null,
    color: color ?? null,
    termsText: termsText ?? null,
    identifiers: identifiers ?? {},
  };
  if (jurisdiction !== undefined) {
    if (!PROFILES[jurisdiction]) {
      return res.status(400).json({ error: `unknown jurisdiction "${jurisdiction}"` });
    }
    patch.jurisdiction = jurisdiction;
  }

  const settings = await saveBusinessSettings(req.businessId!, patch);
  res.json(settings);
});

app.post('/api/business/logo', requireAuth, upload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'logo file is required (field name "logo", png/jpeg/svg/webp, max 2MB)' });
  }
  // Content-sniffed from the actual bytes, never trusting the client's Content-Type header or
  // filename extension - both are attacker-controlled and don't have to match the real content.
  const sniffed = sniffImageType(req.file.buffer);
  if (!sniffed) {
    return res.status(400).json({ error: 'file is not a recognized PNG/JPEG/WEBP/SVG image' });
  }
  // One canonical logo file per business - clear any stale file from a previous upload in a
  // different format first, so old bytes never linger under a dead filename.
  for (const ext of ['.png', '.jpg', '.webp', '.svg']) {
    const stale = join(uploadsDir, `logo-${req.businessId}${ext}`);
    if (existsSync(stale)) unlinkSync(stale);
  }
  const filename = `logo-${req.businessId}${extensionForImageType(sniffed)}`;
  const logoPath = join(uploadsDir, filename);
  writeFileSync(logoPath, req.file.buffer);
  const settings = await saveBusinessSettings(req.businessId!, { logoPath });
  res.json({ ...settings, logoUrl: `/uploads/${filename}` });
});

app.get('/api/quotes/:id/pdf', requireAuth, async (req, res) => {
  const loaded = await loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });

  const business = await getBusinessSettings(req.businessId!);
  const html = buildQuoteHtml(loaded.quote, loaded.result, business, loaded.customer);
  const filename = quotePdfFilename(loaded.quote.quoteNumber, loaded.customer?.companyName ?? null);

  try {
    const pdfPath = await renderQuotePdf(loaded.quoteRow.id, html);
    await pool.query('UPDATE quotes SET pdf_path = $1 WHERE id = $2', [pdfPath, loaded.quoteRow.id]);
    // Downloaded does not mean sent - a separate "Mark as sent" action records that explicitly.
    await pool.query(
      `INSERT INTO send_events (id, quote_id, business_id, method, sent_by, sent_at, outcome)
       VALUES ($1, $2, $3, 'manual', $4, $5, 'downloaded')`,
      [randomUUID(), loaded.quoteRow.id, req.businessId!, req.userId!, new Date().toISOString()],
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(pdfPath);
  } catch (err) {
    // err.message here can be a raw Puppeteer/filesystem error (has included internal detail
    // like "Protocol error: Connection closed..." in practice) - log it server-side only.
    console.error('PDF generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

app.post('/api/quotes/:id/mark-sent', requireAuth, async (req, res) => {
  const loaded = await loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });

  await pool.query(
    `INSERT INTO send_events (id, quote_id, business_id, method, sent_by, sent_at, outcome)
     VALUES ($1, $2, $3, 'manual', $4, $5, 'marked_sent')`,
    [randomUUID(), loaded.quoteRow.id, req.businessId!, req.userId!, new Date().toISOString()],
  );
  res.status(201).json({ ok: true });
});

app.get('/api/quotes/:id/send-events', requireAuth, async (req, res) => {
  const loaded = await loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });

  const { rows } = await pool.query<{
    id: string;
    method: string;
    recipient_email: string | null;
    sent_by_name: string | null;
    sent_by_email: string;
    sent_at: string;
    outcome: string;
    gmail_message_id: string | null;
    error_detail: string | null;
  }>(
    `SELECT se.id, se.method, se.recipient_email, u.name as sent_by_name, u.email as sent_by_email,
            se.sent_at, se.outcome, se.gmail_message_id, se.error_detail
     FROM send_events se
     JOIN users u ON u.id = se.sent_by
     WHERE se.quote_id = $1 AND se.business_id = $2
     ORDER BY se.sent_at DESC`,
    [req.params.id, req.businessId!],
  );

  const events = rows.map((row) => ({
    id: row.id,
    method: row.method,
    recipientEmail: row.recipient_email,
    sentByName: row.sent_by_name ?? row.sent_by_email,
    sentAt: row.sent_at,
    outcome: row.outcome,
    gmailMessageId: row.gmail_message_id,
    errorDetail: row.error_detail,
  }));

  // Server-side single source of truth for default subject/body, so the frontend never
  // hardcodes the "valid for 30 days" copy itself.
  const defaultSubject = `Your quote ${loaded.quote.quoteNumber}`;
  res.json({ events, defaultSubject, defaultBody: DEFAULT_BODY });
});

// ---------------------------------------------------------------------------
// Gmail send: separate incremental-consent OAuth flow, distinct from sign-in.
// ---------------------------------------------------------------------------

app.get('/api/auth/google/gmail/status', requireAuth, async (req, res) => {
  const connection = await getGmailConnection(req.businessId!);
  // No email/identity field - gmail.send scope alone can't read which account was connected
  // (see auth.ts's exchangeGmailCode). The frontend just shows "connected" without an address.
  res.json({ connected: Boolean(connection) });
});

app.get('/api/auth/google/gmail/authorize', requireAuth, (req, res) => {
  if (!isGmailSendConfigured()) {
    return res.status(400).json({ error: 'Gmail send is not configured on the server' });
  }
  const quoteId = typeof req.query.quoteId === 'string' ? req.query.quoteId : '';
  const nonce = randomBytes(16).toString('base64url');
  const state = signGmailOAuthState({ businessId: req.businessId!, quoteId, nonce });
  res.cookie('gmail_oauth_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(gmailAuthorizeUrl(state));
});

app.get('/api/auth/google/callback', requireAuth, async (req, res) => {
  const failClosed = (reason: string) => {
    res.clearCookie('gmail_oauth_nonce');
    const quoteId = typeof req.query.state === 'string' ? parsedQuoteIdFromState : '';
    console.error('Gmail OAuth callback failed:', reason);
    res.redirect(`${WEB_ORIGINS[0]}/quotes/${quoteId || ''}?gmail=error`);
  };

  const stateParam = typeof req.query.state === 'string' ? req.query.state : '';
  const state = verifyGmailOAuthState(stateParam);
  const parsedQuoteIdFromState = state?.quoteId ?? '';
  if (!state) return failClosed('invalid or expired state token');

  const cookieNonce = req.cookies?.gmail_oauth_nonce;
  const nonceBuf = Buffer.from(state.nonce || '');
  const cookieBuf = Buffer.from(cookieNonce || '');
  if (!cookieNonce || nonceBuf.length !== cookieBuf.length || !timingSafeEqual(nonceBuf, cookieBuf)) {
    return failClosed('nonce mismatch (missing/expired cookie, or CSRF attempt)');
  }

  // Operator switched business profiles in another tab between clicking Connect and Google
  // redirecting back - fail closed rather than attaching the new Google account to the wrong business.
  if (state.businessId !== req.businessId) {
    res.clearCookie('gmail_oauth_nonce');
    return res.redirect(`${WEB_ORIGINS[0]}/quotes/${state.quoteId}?gmail=business_mismatch`);
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  if (!code) return failClosed('no authorization code in callback');

  try {
    const { refreshToken } = await exchangeGmailCode(code);
    await saveGmailConnection({
      businessId: req.businessId!,
      refreshToken,
      connectedByUserId: req.userId!,
    });
    res.clearCookie('gmail_oauth_nonce');
    res.redirect(`${WEB_ORIGINS[0]}/quotes/${state.quoteId}?gmail=connected`);
  } catch (err) {
    failClosed(err instanceof Error ? err.message : 'token exchange failed');
  }
});

app.post('/api/auth/google/gmail/disconnect', requireAuth, async (req, res) => {
  await deleteGmailConnection(req.businessId!);
  res.status(204).end();
});

app.post('/api/quotes/:id/send-gmail', requireAuth, async (req, res) => {
  const loaded = await loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });

  const unknownFields = rejectUnknownFields(req.body, ['to', 'subject', 'body']);
  if (unknownFields) return res.status(400).json({ error: unknownFields });
  const { to, subject, body } = req.body ?? {};
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }

  const connection = await getGmailConnection(req.businessId!);
  if (!connection) {
    return res.status(400).json({ error: 'gmail_not_connected' });
  }

  let accessToken: string;
  try {
    accessToken = await getGmailAccessToken(req.businessId!);
  } catch (err) {
    if (err instanceof GmailReauthRequiredError) {
      await pool.query(
        `INSERT INTO send_events (id, quote_id, business_id, method, recipient_email, sent_by, sent_at, outcome, error_detail)
         VALUES ($1, $2, $3, 'gmail', $4, $5, $6, 'failed', $7)`,
        [randomUUID(), loaded.quoteRow.id, req.businessId!, to, req.userId!, new Date().toISOString(), 'Google authorization was revoked'],
      );
      return res.status(409).json({ error: 'gmail_reauth_required' });
    }
    throw err;
  }

  const business = await getBusinessSettings(req.businessId!);
  const html = buildQuoteHtml(loaded.quote, loaded.result, business, loaded.customer);
  const pdfPath = await renderQuotePdf(loaded.quoteRow.id, html);
  const pdfBytes = readFileSync(pdfPath);
  const filename = quotePdfFilename(loaded.quote.quoteNumber, loaded.customer?.companyName ?? null);

  const email = composeQuoteEmail({
    to,
    subject,
    body,
    // No `from` - the connected account's address isn't known to us (gmail.send-only scope),
    // and Gmail auto-fills the From header from the authenticated account when it's omitted.
    attachmentFilename: filename,
    pdfBytes,
  });

  const result = await sendComposedEmail(email, async () => accessToken);

  await pool.query(
    `INSERT INTO send_events (id, quote_id, business_id, method, recipient_email, sent_by, sent_at, outcome, gmail_message_id, error_detail)
     VALUES ($1, $2, $3, 'gmail', $4, $5, $6, $7, $8, $9)`,
    [
      randomUUID(),
      loaded.quoteRow.id,
      req.businessId!,
      to,
      req.userId!,
      new Date().toISOString(),
      result.outcome,
      result.gmailMessageId ?? null,
      result.errorDetail ?? null,
    ],
  );

  if (result.outcome === 'failed') {
    return res.status(502).json({ error: result.errorDetail ?? 'Gmail send failed' });
  }
  res.status(201).json({ outcome: result.outcome, gmailMessageId: result.gmailMessageId });
});

// Catch-all JSON error handler — required now that DB calls are async: express-async-errors
// forwards rejected promises here instead of the request hanging with no response, which is
// what would otherwise happen on Express 4.x with no error-handling middleware at all.
//
// err.message used to be sent straight to the client - for a pg error that can be the raw SQL
// detail (constraint name, column name, sometimes a filesystem path for an ENOENT-style error).
// Full detail (including the stack) is still logged server-side; the client only ever gets a
// generic message plus a correlation id so a report can be matched back to the server log.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const errorId = randomUUID();
  console.error(`[${errorId}]`, err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'internal server error', errorId });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5187;
app.listen(PORT, () => {
  console.log(`quote-engine api listening on http://localhost:${PORT}`);
  if (!isGoogleSignInConfigured()) {
    console.log('  (GOOGLE_CLIENT_ID not set — Google sign-in disabled, email/password still works)');
  }
});
