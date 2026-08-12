import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db.js';

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

// Web and API are deployed on separate domains (e.g. Vercel + Fly.io), so the session cookie
// must be sent cross-site: that requires SameSite=None, which browsers only honor alongside
// Secure. Local dev runs both over plain http on the same-site localhost, where Secure cookies
// would silently not be set at all — so this only applies in production.
const isProduction = process.env.NODE_ENV === 'production';

export const sessionCookieName = SESSION_COOKIE;
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
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

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
}

export function findUserByGoogleId(googleId: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

/** The business used right after login/signup when none is specified — the first one this owner created. */
export function findBusinessForOwner(userId: string): { id: string; name: string } | undefined {
  return db
    .prepare('SELECT id, name FROM businesses WHERE owner_user_id = ? ORDER BY created_at ASC LIMIT 1')
    .get(userId) as { id: string; name: string } | undefined;
}

export function findBusinessById(businessId: string): { id: string; name: string } | undefined {
  return db.prepare('SELECT id, name FROM businesses WHERE id = ?').get(businessId) as
    | { id: string; name: string }
    | undefined;
}

export function listBusinessesForOwner(userId: string): { id: string; name: string }[] {
  return db
    .prepare('SELECT id, name FROM businesses WHERE owner_user_id = ? ORDER BY created_at ASC')
    .all(userId) as { id: string; name: string }[];
}

export function isBusinessOwnedByUser(businessId: string, userId: string): boolean {
  return Boolean(
    db.prepare('SELECT 1 FROM businesses WHERE id = ? AND owner_user_id = ?').get(businessId, userId),
  );
}

/** Creates an additional business profile for an already-registered user — e.g. "I also operate in Nepal." Each business is locked to one jurisdiction (a business is registered in one place); operating in several markets means owning several business profiles, switchable from Business Settings. */
export function createBusinessForUser(
  ownerUserId: string,
  name: string,
  jurisdiction: string,
): { id: string; name: string } {
  const businessId = randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO businesses (id, owner_user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
      businessId,
      ownerUserId,
      name,
      now,
    );
    db.prepare(
      'INSERT INTO business_settings (business_id, jurisdiction, updated_at) VALUES (?, ?, ?)',
    ).run(businessId, jurisdiction, now);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { id: businessId, name };
}

/** Creates a user (email/password, Google, or both known upfront) plus their first Business, in one transaction. */
export function createUserWithBusiness(input: {
  email: string;
  name?: string | null;
  passwordHash?: string | null;
  googleId?: string | null;
  businessName: string;
  jurisdiction?: string | null;
}): { user: UserRow; business: { id: string; name: string } } {
  const userId = randomUUID();
  const businessId = randomUUID();
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, google_id, name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(userId, input.email.toLowerCase(), input.passwordHash ?? null, input.googleId ?? null, input.name ?? null, now);

    db.prepare('INSERT INTO businesses (id, owner_user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
      businessId,
      userId,
      input.businessName,
      now,
    );

    if (input.jurisdiction) {
      db.prepare(
        'INSERT INTO business_settings (business_id, jurisdiction, updated_at) VALUES (?, ?, ?)',
      ).run(businessId, input.jurisdiction, now);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

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

export function linkGoogleIdToUser(userId: string, googleId: string): void {
  db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, userId);
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
