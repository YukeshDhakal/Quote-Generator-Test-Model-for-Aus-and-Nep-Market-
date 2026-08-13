import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { pool, withTransaction } from './db.js';

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

export type { UserRow };
