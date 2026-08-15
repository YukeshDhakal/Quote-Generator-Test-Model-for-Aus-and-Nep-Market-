import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const b64 = process.env.TOKEN_ENCRYPTION_KEY;
  if (!b64) throw new Error('TOKEN_ENCRYPTION_KEY is not configured on the server');
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes');
  return key;
}

/** Same validation as getKey(), exposed for the boot-time fail-fast check in server.ts - lets a
 * malformed/missing key surface immediately on startup instead of on the first Gmail send. */
export function assertTokenEncryptionKeyValid(): void {
  getKey();
}

/** iv.tag.ciphertext, each base64, dot-joined - single TEXT column, no sub-columns needed. A
 * fresh random IV per call makes this safe to call repeatedly (e.g. on reconnect) with the same key. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, ctB64] = encoded.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('malformed encrypted token');
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
