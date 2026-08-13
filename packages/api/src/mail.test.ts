import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeQuoteEmail, buildRawMimeMessage, sendComposedEmail } from './mail.js';

function samplePdfBytes(): Buffer {
  return Buffer.from('%PDF-1.4 fake pdf bytes for testing');
}

test('buildRawMimeMessage produces a well-formed multipart message with the PDF attached', () => {
  const email = composeQuoteEmail({
    to: 'customer@example.com',
    subject: 'Your quote AUQU2627-0001',
    body: 'Please find attached our quotation, valid for 30 days.',
    from: 'Test Business <operator@gmail.com>',
    attachmentFilename: 'AUQU2627-0001-Test Co.pdf',
    pdfBytes: samplePdfBytes(),
  });
  const raw = buildRawMimeMessage(email);

  assert.match(raw, /^To: customer@example\.com\r\n/);
  assert.match(raw, /Content-Type: multipart\/mixed; boundary="([^"]+)"/);
  assert.match(raw, /Content-Type: application\/pdf; name="AUQU2627-0001-Test Co\.pdf"/);
  assert.match(raw, /Content-Disposition: attachment/);

  // Base64 round-trips back to the exact original PDF bytes.
  const boundaryMatch = raw.match(/boundary="([^"]+)"/);
  assert.ok(boundaryMatch);
  const parts = raw.split(`--${boundaryMatch![1]}`);
  const attachmentPart = parts.find((p) => p.includes('application/pdf'));
  assert.ok(attachmentPart);
  const base64Body = attachmentPart!.split('\r\n\r\n')[1].replace(/\r\n/g, '').trim();
  assert.deepEqual(Buffer.from(base64Body, 'base64'), samplePdfBytes());
});

test('buildRawMimeMessage RFC 2047-encodes a non-ASCII subject', () => {
  const email = composeQuoteEmail({
    to: 'customer@example.com',
    subject: 'तपाईंको उद्धरण',
    body: 'Namaste',
    from: 'Test Business <operator@gmail.com>',
    attachmentFilename: 'quote.pdf',
    pdfBytes: samplePdfBytes(),
  });
  const raw = buildRawMimeMessage(email);
  assert.match(raw, /^Subject: =\?UTF-8\?B\?/m);
});

test('buildRawMimeMessage leaves an ASCII subject unencoded', () => {
  const email = composeQuoteEmail({
    to: 'customer@example.com',
    subject: 'Your quote AUQU2627-0001',
    body: 'Hello',
    from: 'a@example.com',
    attachmentFilename: 'quote.pdf',
    pdfBytes: samplePdfBytes(),
  });
  const raw = buildRawMimeMessage(email);
  assert.match(raw, /^Subject: Your quote AUQU2627-0001\r\n/m);
});

test('sendComposedEmail under MAIL_MODE=console (default) never calls fetch', async () => {
  const originalMode = process.env.MAIL_MODE;
  const originalFetch = globalThis.fetch;
  delete process.env.MAIL_MODE; // default, not explicitly set - must still be 'console', never 'gmail'

  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch should not be called in console mode');
  }) as typeof fetch;

  try {
    const email = composeQuoteEmail({
      to: 'customer@example.com',
      subject: 'Your quote AUQU2627-0001',
      body: 'Please find attached our quotation, valid for 30 days.',
      from: 'a@example.com',
      attachmentFilename: 'quote.pdf',
      pdfBytes: samplePdfBytes(),
    });
    const result = await sendComposedEmail(email);
    assert.equal(result.outcome, 'accepted');
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalMode !== undefined) process.env.MAIL_MODE = originalMode;
  }
});
