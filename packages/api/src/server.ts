import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
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
  findBusinessById,
  findBusinessForOwner,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  hashPassword,
  isBusinessOwnedByUser,
  isGoogleSignInConfigured,
  linkGoogleIdToUser,
  listBusinessesForOwner,
  sessionCookieName,
  sessionCookieOptions,
  clearSessionCookieOptions,
  signSession,
  verifyGoogleCredential,
  verifyPassword,
  verifySession,
} from './auth.js';
import { getBusinessSettings, saveBusinessSettings, uploadsDir } from './business.js';
import { db } from './db.js';
import { nextQuoteNumber, peekNextQuoteNumber } from './numbering.js';
import { todayInProfileCalendar } from './today.js';
import { buildQuoteHtml, renderQuotePdf } from './pdf.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      businessId?: string;
    }
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

const app = express();
// Fly puts one reverse-proxy hop in front of this app; without trust proxy, express-rate-limit
// (and req.ip generally) would see every request as coming from the proxy's own address instead
// of the real client, either lumping all users into one shared limit or disabling limiting
// entirely. `1` trusts exactly that one hop's X-Forwarded-For entry, not the whole chain.
app.set('trust proxy', 1);
app.use(cors({ origin: WEB_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

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

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => cb(null, `logo-${(req as Request).businessId}${extname(file.originalname) || '.png'}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(png|jpeg|svg\+xml|webp)$/.test(file.mimetype));
  },
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
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'an account with this email already exists' });
  }

  const passwordHash = await hashPassword(password);
  const { user, business } = createUserWithBusiness({
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
  const { email, password } = req.body ?? {};
  const user = email ? findUserByEmail(email) : undefined;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'invalid email or password' });
  }
  const valid = await verifyPassword(password ?? '', user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  const business = findBusinessForOwner(user.id);
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

  let user = findUserByGoogleId(payload.sub);

  if (!user) {
    const existingByEmail = findUserByEmail(payload.email);
    if (existingByEmail) {
      linkGoogleIdToUser(existingByEmail.id, payload.sub);
      user = { ...existingByEmail, google_id: payload.sub };
    } else {
      const created = createUserWithBusiness({
        email: payload.email,
        name: payload.name ?? null,
        googleId: payload.sub,
        businessName: `${payload.name || payload.email.split('@')[0]}'s Business`,
      });
      user = created.user;
    }
  }

  const business = findBusinessForOwner(user.id);
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

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = findUserById(req.userId!);
  const business = findBusinessById(req.businessId!);
  if (!user || !business) return res.status(401).json({ error: 'not authenticated' });
  res.json({ user: { id: user.id, email: user.email, name: user.name }, business });
});

app.get('/api/auth/businesses', requireAuth, (req, res) => {
  const businesses = listBusinessesForOwner(req.userId!).map((b) => ({
    ...b,
    jurisdiction: getBusinessSettings(b.id).jurisdiction,
    active: b.id === req.businessId,
  }));
  res.json(businesses);
});

app.post('/api/auth/businesses', requireAuth, (req, res) => {
  const { name, jurisdiction } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!jurisdiction || !PROFILES[jurisdiction]) {
    return res.status(400).json({ error: `unknown jurisdiction "${jurisdiction}"` });
  }

  const business = createBusinessForUser(req.userId!, name, jurisdiction);
  setSessionCookie(res, req.userId!, business.id);
  res.status(201).json(business);
});

app.post('/api/auth/switch-business', requireAuth, (req, res) => {
  const { businessId } = req.body ?? {};
  if (!businessId || !isBusinessOwnedByUser(businessId, req.userId!)) {
    return res.status(403).json({ error: 'not your business' });
  }
  setSessionCookie(res, req.userId!, businessId);
  const business = findBusinessById(businessId);
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
  taxable: number;
  sort_order: number;
}

function loadQuote(businessId: string, quoteId: string) {
  const quoteRow = db.prepare('SELECT * FROM quotes WHERE id = ? AND business_id = ?').get(quoteId, businessId) as
    | QuoteRow
    | undefined;
  if (!quoteRow) return null;

  const requestRow = db.prepare('SELECT * FROM requests WHERE id = ?').get(quoteRow.request_id) as
    | RequestRow
    | undefined;

  const lineItemRows = db
    .prepare('SELECT * FROM line_items WHERE quote_id = ? ORDER BY sort_order')
    .all(quoteId) as unknown as LineItemRow[];

  const lineItems: LineItem[] = lineItemRows.map((row) => ({
    productCode: row.product_code ?? '',
    description: row.description,
    qty: row.qty,
    unitPrice: row.unit_price,
    taxable: Boolean(row.taxable),
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

app.post('/api/requests', (req, res) => {
  const { customerName, companyName, deliveryAddress, billingAddress } = req.body ?? {};
  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO requests (id, business_id, customer_name, company_name, delivery_address, billing_address, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    req.businessId!,
    customerName,
    companyName ?? null,
    deliveryAddress ?? null,
    billingAddress ?? null,
    new Date().toISOString(),
  );

  res.status(201).json({ id, customerName, companyName, deliveryAddress, billingAddress });
});

app.put('/api/requests/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM requests WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.businessId!) as RequestRow | undefined;
  if (!existing) return res.status(404).json({ error: 'request not found' });

  const { customerName, companyName, deliveryAddress, billingAddress } = req.body ?? {};
  if (!customerName) {
    return res.status(400).json({ error: 'customerName is required' });
  }

  db.prepare(
    `UPDATE requests SET customer_name = ?, company_name = ?, delivery_address = ?, billing_address = ?
     WHERE id = ? AND business_id = ?`,
  ).run(customerName, companyName ?? null, deliveryAddress ?? null, billingAddress ?? null, req.params.id, req.businessId!);

  res.json({ id: req.params.id, customerName, companyName: companyName ?? null, deliveryAddress: deliveryAddress ?? null, billingAddress: billingAddress ?? null });
});

app.get('/api/requests', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM requests WHERE business_id = ? ORDER BY created_at DESC')
    .all(req.businessId!) as unknown as RequestRow[];
  const withQuoteCounts = rows.map((row) => {
    const { count } = db.prepare('SELECT COUNT(*) as count FROM quotes WHERE request_id = ?').get(row.id) as {
      count: number;
    };
    return {
      id: row.id,
      customerName: row.customer_name,
      companyName: row.company_name,
      deliveryAddress: row.delivery_address,
      billingAddress: row.billing_address,
      createdAt: row.created_at,
      quoteCount: count,
    };
  });
  res.json(withQuoteCounts);
});

app.post('/api/requests/:requestId/quotes', (req, res) => {
  const { requestId } = req.params;
  const requestRow = db
    .prepare('SELECT * FROM requests WHERE id = ? AND business_id = ?')
    .get(requestId, req.businessId!) as RequestRow | undefined;
  if (!requestRow) {
    return res.status(404).json({ error: 'request not found' });
  }

  const { documentTypeKey, date, splitValue, lineItems, orderDiscount, delivery } = req.body ?? {};

  // Jurisdiction is never taken from the client — it's the business's own locked jurisdiction,
  // set once in Business Settings. A business registered in one place can't quote as another.
  const jurisdiction = getBusinessSettings(req.businessId!).jurisdiction;
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
  const quoteNumber = nextQuoteNumber(db, req.businessId!, jurisdiction, documentTypeKey, fiscalYear);

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO quotes (
        id, business_id, request_id, quote_number, jurisdiction, jurisdiction_profile_version, jurisdiction_profile_json,
        document_type_key, split_value, quote_date, order_discount_type, order_discount_value,
        delivery_mode, delivery_amount, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
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
    );

    lineItems.forEach((item: LineItem, index: number) => {
      db.prepare(
        `INSERT INTO line_items (id, quote_id, product_code, description, qty, unit_price, taxable, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        quoteId,
        item.productCode ?? null,
        item.description,
        item.qty,
        item.unitPrice,
        item.taxable ? 1 : 0,
        index,
      );
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const loaded = loadQuote(req.businessId!, quoteId);
  res.status(201).json(loaded);
});

app.get('/api/quotes/:id', (req, res) => {
  const loaded = loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });
  res.json(loaded);
});

app.put('/api/quotes/:id', (req, res) => {
  const quoteRow = db
    .prepare('SELECT * FROM quotes WHERE id = ? AND business_id = ?')
    .get(req.params.id, req.businessId!) as QuoteRow | undefined;
  if (!quoteRow) return res.status(404).json({ error: 'quote not found' });

  // Jurisdiction is not editable here — it's baked into the quote number's prefix, so changing
  // it would make the already-issued number wrong. Delete and re-create instead if that's needed.
  const profile: JurisdictionProfile = JSON.parse(quoteRow.jurisdiction_profile_json);
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

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `UPDATE quotes SET
        document_type_key = ?, split_value = ?, quote_date = ?, order_discount_type = ?, order_discount_value = ?,
        delivery_mode = ?, delivery_amount = ?, pdf_path = NULL
       WHERE id = ?`,
    ).run(
      documentTypeKey,
      splitValue ?? null,
      date,
      orderDiscount?.type ?? null,
      orderDiscount?.value ?? null,
      delivery?.mode ?? null,
      delivery?.amount ?? null,
      req.params.id,
    );

    db.prepare('DELETE FROM line_items WHERE quote_id = ?').run(req.params.id);

    lineItems.forEach((item: LineItem, index: number) => {
      db.prepare(
        `INSERT INTO line_items (id, quote_id, product_code, description, qty, unit_price, taxable, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        req.params.id,
        item.productCode ?? null,
        item.description,
        item.qty,
        item.unitPrice,
        item.taxable ? 1 : 0,
        index,
      );
    });

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const loaded = loadQuote(req.businessId!, req.params.id);
  res.json(loaded);
});

app.get('/api/quotes', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : null;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : null;

  // Both bounds are expressed in whatever jurisdiction's calendar the client resolved them in
  // (the business's own locked jurisdiction), so validate against that profile.
  if (from && to) {
    const businessJurisdiction = getBusinessSettings(req.businessId!).jurisdiction;
    const profile = businessJurisdiction ? PROFILES[businessJurisdiction] : null;
    const cmp = profile ? compareProfileDates(profile, from, to) : null;
    if (cmp !== null && cmp > 0) {
      return res.status(400).json({ error: '"to" date must not be before "from" date' });
    }
  }

  const rows = (
    search
      ? db
          .prepare(
            `SELECT q.*, r.customer_name, r.company_name FROM quotes q
             JOIN requests r ON r.id = q.request_id
             WHERE q.business_id = ? AND (q.quote_number LIKE ? OR r.customer_name LIKE ?)
             ORDER BY q.created_at DESC`,
          )
          .all(req.businessId!, `%${search}%`, `%${search}%`)
      : db
          .prepare(
            `SELECT q.*, r.customer_name, r.company_name FROM quotes q
             JOIN requests r ON r.id = q.request_id
             WHERE q.business_id = ?
             ORDER BY q.created_at DESC`,
          )
          .all(req.businessId!)
  ) as unknown as (QuoteRow & { customer_name: string; company_name: string | null })[];

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

  const summaries = dateFiltered.map((row) => {
    const loaded = loadQuote(req.businessId!, row.id)!;
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
  });

  res.json(summaries);
});

app.get('/api/dashboard', (req, res) => {
  const businessId = req.businessId!;
  const { quoteCount } = db.prepare('SELECT COUNT(*) as quoteCount FROM quotes WHERE business_id = ?').get(
    businessId,
  ) as { quoteCount: number };

  const rows = db
    .prepare(
      `SELECT q.*, r.customer_name, r.company_name FROM quotes q
       JOIN requests r ON r.id = q.request_id
       WHERE q.business_id = ?
       ORDER BY q.created_at DESC
       LIMIT 5`,
    )
    .all(businessId) as unknown as (QuoteRow & { customer_name: string; company_name: string | null })[];

  const recentQuotes = rows.map((row) => {
    const loaded = loadQuote(businessId, row.id)!;
    return {
      id: row.id,
      quoteNumber: row.quote_number,
      customerName: row.customer_name,
      jurisdiction: row.jurisdiction,
      documentTypeTitle: loaded.result.documentType.title,
      date: row.quote_date,
      grandTotal: loaded.result.totals.grandTotal,
    };
  });

  const totalsByJurisdiction = (['AU', 'NP'] as const).map((jurisdiction) => {
    const jurisdictionRows = db
      .prepare('SELECT id FROM quotes WHERE business_id = ? AND jurisdiction = ?')
      .all(businessId, jurisdiction) as unknown as { id: string }[];
    const results = jurisdictionRows.map((r) => loadQuote(businessId, r.id)!.result.totals);
    const grandTotal = results.reduce((sum, t) => sum + t.grandTotal, 0);
    const taxTotal = results.reduce((sum, t) => sum + t.taxAmount, 0);
    return { jurisdiction, quoteCount: jurisdictionRows.length, grandTotal, taxTotal, subtotal: grandTotal - taxTotal };
  });

  const businessJurisdiction = getBusinessSettings(businessId).jurisdiction;
  const nextNumber =
    businessJurisdiction && PROFILES[businessJurisdiction]
      ? peekNextQuoteNumber(
          db,
          businessId,
          businessJurisdiction,
          PROFILES[businessJurisdiction].documentTypes[0].key,
          financialYearTag(PROFILES[businessJurisdiction], todayInProfileCalendar(PROFILES[businessJurisdiction])),
        )
      : null;

  res.json({ quoteCount, recentQuotes, totalsByJurisdiction, businessJurisdiction, nextNumber });
});

app.get('/api/business', (req, res) => {
  res.json(getBusinessSettings(req.businessId!));
});

app.put('/api/business', (req, res) => {
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

  const settings = saveBusinessSettings(req.businessId!, patch);
  res.json(settings);
});

app.post('/api/business/logo', requireAuth, upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'logo file is required (field name "logo", png/jpeg/svg/webp, max 2MB)' });
  }
  const settings = saveBusinessSettings(req.businessId!, { logoPath: join(uploadsDir, req.file.filename) });
  res.json({ ...settings, logoUrl: `/uploads/${req.file.filename}` });
});

app.get('/api/quotes/:id/pdf', requireAuth, async (req, res) => {
  const loaded = loadQuote(req.businessId!, req.params.id);
  if (!loaded) return res.status(404).json({ error: 'quote not found' });

  const business = getBusinessSettings(req.businessId!);
  const html = buildQuoteHtml(loaded.quote, loaded.result, business, loaded.customer);

  try {
    const pdfPath = await renderQuotePdf(loaded.quoteRow.id, html);
    db.prepare('UPDATE quotes SET pdf_path = ? WHERE id = ?').run(pdfPath, loaded.quoteRow.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${loaded.quote.quoteNumber}.pdf"`);
    res.sendFile(pdfPath);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'PDF generation failed' });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5187;
app.listen(PORT, () => {
  console.log(`quote-engine api listening on http://localhost:${PORT}`);
  if (!isGoogleSignInConfigured()) {
    console.log('  (GOOGLE_CLIENT_ID not set — Google sign-in disabled, email/password still works)');
  }
});
