import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

before(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
});

test('encryptToken/decryptToken round-trip', async () => {
  const { encryptToken, decryptToken } = await import('./crypto.js');
  const plaintext = '1//0gExampleRefreshTokenValue';
  const encrypted = encryptToken(plaintext);
  assert.notEqual(encrypted, plaintext);
  assert.equal(decryptToken(encrypted), plaintext);
});

test('encryptToken produces a different ciphertext each time (fresh IV)', async () => {
  const { encryptToken } = await import('./crypto.js');
  const a = encryptToken('same-plaintext');
  const b = encryptToken('same-plaintext');
  assert.notEqual(a, b);
});

test('decryptToken rejects a tampered ciphertext', async () => {
  const { encryptToken, decryptToken } = await import('./crypto.js');
  const encrypted = encryptToken('secret-value');
  const [iv, tag, ct] = encrypted.split('.');
  const tampered = [iv, tag, Buffer.from('tampered').toString('base64')].join('.');
  assert.throws(() => decryptToken(tampered));
});
