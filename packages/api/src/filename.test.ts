import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilenameSegment, quotePdfFilename } from './filename.js';

test('sanitizeFilenameSegment strips / \\ : * ? " < > |', () => {
  assert.equal(sanitizeFilenameSegment('A/B\\C:D*E?F"G<H>I|J'), 'ABCDEFGHIJ');
});

test('sanitizeFilenameSegment trims whitespace left after stripping', () => {
  assert.equal(sanitizeFilenameSegment('  Trading Co  '), 'Trading Co');
});

test('quotePdfFilename combines quote number and sanitized company', () => {
  assert.equal(quotePdfFilename('AUQU2627-0001', 'A/B\\C:Trading'), 'AUQU2627-0001-ABCTrading.pdf');
});

test('quotePdfFilename falls back to quote number alone when company is null', () => {
  assert.equal(quotePdfFilename('AUQU2627-0001', null), 'AUQU2627-0001.pdf');
});

test('quotePdfFilename falls back to quote number when company sanitizes to empty', () => {
  assert.equal(quotePdfFilename('AUQU2627-0001', '///'), 'AUQU2627-0001.pdf');
});
