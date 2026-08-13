import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { pool, withTransaction } from './db.js';
import { encryptToken, decryptToken } from './crypto.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const secretPath = join(__dirname, '..', 'data', '.session-secret');

function loadOrCreateSessionSecret(): string {
  if (existsSync(secretPath)) return readFileSync(secretPath, 'utf8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(secretPath, secret, 'utf8');
  return secret;
}

const SESSION_SECRET = loadOrCreateSessionSecret();
const SESSION_COOKIE = 'quote_engine_session';
const SESSION_TTL_DAYS = 30;

export interface SessionPayload {
  userId: string;
  businessId: string;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: `${SESSION_TTL_DAYS}d` });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export interface GmailOAuthState {
  businessId: string;
  quoteId: string;
  nonce: string;
}

/** Signs a short-lived state token binding a Gmail-connect attempt to the business/quote that
 * started it, plus a nonce echoed back via an httpOnly cookie - the standard CSRF mitigation for
 * an OAuth redirect dance, independent of (and in addition to) the session cookie surviving the
 * round trip. `typ` stops this being confused with a real session JWT even though they share a secret. */
export function signGmailOAuthState(payload: GmailOAuthState): string {
  return jwt.sign({ typ: 'gmail_oauth_state', ...payload }, SESSION_SECRET, { expiresIn: '10m' });
}

export function verifyGmailOAuthState(token: string): GmailOAuthState | null {
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as GmailOAuthState & { typ?: string };
    if (decoded.typ !== 'gmail_oauth_state') return null;
    return { businessId: decoded.businessId, quoteId: decoded.quoteId, nonce: decoded.nonce };
  } catch {
    return null;
  }
}

// The API is mid-migration from quoteengine.fly.dev (cross-site to the web app, needs
// SameSite=None) to api.quoteengine.dev (same-site, can use SameSite=Lax — see the git history
// of this line). COOKIE_CROSS_SITE flips the cookie back to None for as long as the web app's
// VITE_API_URL still points at the old fly.dev host; once the DNS cutover to api.quoteengine.dev
// is verified and VITE_API_URL is switched, unset this var (or delete this flag entirely and
// hardcode 'lax', matching the SameSite=Lax state this replaced).
const isProduction = process.env.NODE_ENV === 'production';
const crossSite = process.env.COOKIE_CROSS_SITE === 'true';

export const sessionCookieName = SESSION_COOKIE;
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
};

// Browsers refuse to let a non-Secure/mismatched-SameSite Set-Cookie clear a cookie that was
// set with Secure/SameSite=None (the "leave secure cookies alone" policy) — clearCookie() must
// echo the same httpOnly/sameSite/secure attributes, without maxAge (Express recomputes
// `expires` from maxAge on any res.cookie() call, including the one clearCookie() makes
// internally, which would silently turn a "clear" into a 30-day-future re-set).
export const clearSessionCookieOptions = {
  httpOnly: sessionCookieOptions.httpOnly,
  sameSite: sessionCookieOptions.sameSite,
  secure: sessionCookieOptions.secure,
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string | null;
  created_at: string;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0];
}

export async function findUserByGoogleId(googleId: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0];
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

/** The business used right after login/signup when none is specified — the first one this owner created. */
export async function findBusinessForOwner(userId: string): Promise<{ id: string; name: string } | undefined> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM businesses WHERE owner_user_id = $1 ORDER BY created_at ASC LIMIT 1',
    [userId],
  );
  return rows[0];
}

export async function findBusinessById(businessId: string): Promise<{ id: string; name: string } | undefined> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM businesses WHERE id = $1',
    [businessId],
  );
  return rows[0];
}

export async function listBusinessesForOwner(userId: string): Promise<{ id: string; name: string }[]> {
  const { rows } = await pool.query<{ id: string; name: string }>(
    'SELECT id, name FROM businesses WHERE owner_user_id = $1 ORDER BY created_at ASC',
    [userId],
  );
  return rows;
}

export async function isBusinessOwnedByUser(businessId: string, userId: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM businesses WHERE id = $1 AND owner_user_id = $2', [
    businessId,
    userId,
  ]);
  return rows.length > 0;
}

/** Creates an additional business profile for an already-registered user — e.g. "I also operate in Nepal." Each business is locked to one jurisdiction (a business is registered in one place); operating in several markets means owning several business profiles, switchable from Business Settings. */
export async function createBusinessForUser(
  ownerUserId: string,
  name: string,
  jurisdiction: string,
): Promise<{ id: string; name: string }> {
  const businessId = randomUUID();
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    await client.query('INSERT INTO businesses (id, owner_user_id, name, created_at) VALUES ($1, $2, $3, $4)', [
      businessId,
      ownerUserId,
      name,
      now,
    ]);
    await client.query(
      'INSERT INTO business_settings (business_id, jurisdiction, updated_at) VALUES ($1, $2, $3)',
      [businessId, jurisdiction, now],
    );
  });

  return { id: businessId, name };
}

/** Creates a user (email/password, Google, or both known upfront) plus their first Business, in one transaction. */
export async function createUserWithBusiness(input: {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  googleId?: string | null;
  businessName: string;
  jurisdiction?: string | null;
}): Promise<{ user: UserRow; business: { id: string; name: string } }> {
  const userId = randomUUID();
  const businessId = randomUUID();
  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    await client.query(
      'INSERT INTO users (id, email, password_hash, google_id, name, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, input.email.toLowerCase(), input.passwordHash ?? null, input.googleId ?? null, input.name ?? null, now],
    );

    await client.query('INSERT INTO businesses (id, owner_user_id, name, created_at) VALUES ($1, $2, $3, $4)', [
      businessId,
      userId,
      input.businessName,
      now,
    ]);

    if (input.jurisdiction) {
      await client.query(
        'INSERT INTO business_settings (business_id, jurisdiction, updated_at) VALUES ($1, $2, $3)',
        [businessId, input.jurisdiction, now],
      );
    }
  });

  return {
    user: {
      id: userId,
      email: input.email.toLowerCase(),
      password_hash: input.passwordHash ?? null,
      google_id: input.googleId ?? null,
      name: input.name ?? null,
      created_at: now,
    },
    business: { id: businessId, name: input.businessName },
  };
}

export async function linkGoogleIdToUser(userId: string, googleId: string): Promise<void> {
  await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, userId]);
}

let googleClient: OAuth2Client | null = null;

export function isGoogleSignInConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

/** Verifies a Google Identity Services credential (ID token) and returns the verified payload. No client secret needed. */
export async function verifyGoogleCredential(credential: string): Promise<{ sub: string; email: string; name?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
  }
  googleClient ??= new OAuth2Client(clientId);

  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error('Invalid Google credential');
  }
  return { sub: payload.sub, email: payload.email, name: payload.name };
}

// ---------------------------------------------------------------------------
// Gmail send (separate authorization-code + refresh-token flow, distinct from the ID-token
// sign-in flow above - requires a client secret, which sign-in never needed).
// ---------------------------------------------------------------------------

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
// The API's actual local dev port, not the illustrative :3000 some examples use - must match
// exactly what's registered as an authorized redirect URI in Google Cloud Console.
export const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5187/api/auth/google/callback';

let gmailOAuthClient: OAuth2Client | null = null;

export function isGmailSendConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getGmailOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not configured on the server');
  }
  gmailOAuthClient ??= new OAuth2Client(clientId, clientSecret, GMAIL_REDIRECT_URI);
  return gmailOAuthClient;
}

/** Builds the URL to redirect the operator to for incremental gmail.send consent. `state` should
 * be a signed, short-lived token binding this authorize attempt to the current business+quote
 * (see server.ts's /gmail/authorize route) - verified on the way back in exchangeGmailCode's caller. */
export function gmailAuthorizeUrl(state: string): string {
  return getGmailOAuthClient().generateAuthUrl({
    access_type: 'offline',
    // Forces Google to reissue a refresh_token even if this business previously granted this
    // scope - without it, a reconnect after a revoke could silently come back with no refresh
    // token at all.
    prompt: 'consent',
    scope: GMAIL_SCOPES,
    redirect_uri: GMAIL_REDIRECT_URI,
    state,
  });
}

/** Exchanges an authorization code for tokens. Deliberately does NOT look up which Google account
 * was connected - Gmail's users.getProfile (and every other identity-revealing endpoint) requires
 * a broader scope than gmail.send alone grants (confirmed live: getProfile 403s under gmail.send-only
 * consent). Requesting an extra scope (openid/email) just to learn the address would violate the
 * "gmail.send ONLY" requirement, so the UI shows "Google account connected" without an address
 * rather than adding a second permission line item to the consent screen. */
export async function exchangeGmailCode(code: string): Promise<{ refreshToken: string }> {
  const client = getGmailOAuthClient();
  const { tokens } = await client.getToken({ code, redirect_uri: GMAIL_REDIRECT_URI });
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token - disconnect and reconnect to force fresh consent');
  }
  return { refreshToken: tokens.refresh_token };
}

interface GmailConnectionRow {
  business_id: string;
  refresh_token_encrypted: string;
  scope: string;
  connected_by_user_id: string;
  connected_at: string;
  updated_at: string;
}

export async function getGmailConnection(businessId: string): Promise<GmailConnectionRow | undefined> {
  const { rows } = await pool.query<GmailConnectionRow>('SELECT * FROM gmail_connections WHERE business_id = $1', [
    businessId,
  ]);
  return rows[0];
}

export async function saveGmailConnection(input: {
  businessId: string;
  refreshToken: string;
  connectedByUserId: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const encrypted = encryptToken(input.refreshToken);
  await pool.query(
    `INSERT INTO gmail_connections (business_id, refresh_token_encrypted, scope, connected_by_user_id, connected_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5)
     ON CONFLICT (business_id) DO UPDATE SET
       refresh_token_encrypted = excluded.refresh_token_encrypted,
       scope = excluded.scope,
       connected_by_user_id = excluded.connected_by_user_id,
       updated_at = excluded.updated_at`,
    [input.businessId, encrypted, GMAIL_SCOPES.join(' '), input.connectedByUserId, now],
  );
}

export async function deleteGmailConnection(businessId: string): Promise<void> {
  // Only this table is touched - login (users/sessions) and Download (quotes/pdf) have no
  // dependency on gmail_connections, so disconnecting structurally cannot break either.
  await pool.query('DELETE FROM gmail_connections WHERE business_id = $1', [businessId]);
}

/** Thrown when the stored refresh token no longer works (revoked, expired, or scope changed) -
 * callers should turn this into a clean re-auth prompt, never a 500. */
export class GmailReauthRequiredError extends Error {}

/** Mints a fresh access token from the stored (encrypted) refresh token. No access token is ever
 * stored at rest - minting one per send is one extra Google round-trip, negligible at this app's
 * volume, and avoids an entire class of expiry-bookkeeping bugs plus one more sensitive value in the DB. */
export async function getGmailAccessToken(businessId: string): Promise<string> {
  const connection = await getGmailConnection(businessId);
  if (!connection) {
    throw new GmailReauthRequiredError('No Gmail connection for this business');
  }
  const refreshToken = decryptToken(connection.refresh_token_encrypted);
  const client = getGmailOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  try {
    const { token } = await client.getAccessToken();
    if (!token) {
      throw new GmailReauthRequiredError('Google did not return an access token');
    }
    return token;
  } catch (err) {
    if (err instanceof GmailReauthRequiredError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('invalid_grant') || message.includes('unauthorized_client')) {
      throw new GmailReauthRequiredError('Google authorization was revoked or expired');
    }
    throw err;
  }
}

export type { UserRow };
