import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBlocklistedTerms, BLOCKLISTED_TERMS } from './blocklist.js';
import { DEFAULT_BODY } from './mail.js';

test('DEFAULT_BODY contains no blocklisted terminology', () => {
  assert.deepEqual(findBlocklistedTerms(DEFAULT_BODY), []);
});

test('default subject template contains no blocklisted terminology', () => {
  // Matches the literal template used in server.ts's GET /api/quotes/:id/send-events route.
  assert.deepEqual(findBlocklistedTerms('Your quote '), []);
});

test('findBlocklistedTerms detects each blocklisted term, case-insensitively', () => {
  for (const term of BLOCKLISTED_TERMS) {
    assert.deepEqual(findBlocklistedTerms(`Please pay this ${term.toUpperCase()} now`), [term]);
  }
});

test('findBlocklistedTerms returns empty for clean text', () => {
  assert.deepEqual(findBlocklistedTerms('Please find attached our quotation.'), []);
});
