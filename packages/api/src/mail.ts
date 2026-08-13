import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTBOX_DIR = join(__dirname, '..', 'data', 'outbox');

export interface ComposedEmail {
  to: string;
  // Omitted when the operator's connected address isn't known to us (gmail.send scope alone
  // can't read it - see auth.ts's exchangeGmailCode). Gmail auto-fills the From header from the
  // authenticated account when it's absent from the raw message, which is the semantically
  // correct behavior here, not a fallback: Gmail overrides/rejects a mismatched From anyway.
  from?: string;
  replyTo?: string;
  subject: string;
  bodyText: string;
  attachment: { filename: string; content: Buffer };
}

export const DEFAULT_BODY = 'Please find attached our quotation, valid for 30 days.';

export function composeQuoteEmail(input: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  attachmentFilename: string;
  pdfBytes: Buffer;
}): ComposedEmail {
  return {
    to: input.to,
    from: input.from,
    replyTo: input.from,
    subject: input.subject,
    bodyText: input.body,
    attachment: { filename: input.attachmentFilename, content: input.pdfBytes },
  };
}

function isAscii(s: string): boolean {
  return /^[\x20-\x7E]*$/.test(s);
}

function encodeHeader(value: string): string {
  return isAscii(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function contentDispositionFilename(filename: string): string {
  return isAscii(filename)
    ? `filename="${filename}"`
    : `filename="quote.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function wrapBase64(b64: string): string {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

/**
 * IDENTICAL output regardless of MAIL_MODE - this is what makes MAIL_MODE=console genuinely
 * exercise the same compose-and-attach path as gmail mode, not a simplified stand-in.
 */
export function buildRawMimeMessage(email: ComposedEmail): string {
  const boundary = `----=_QuoteEngine_${randomUUID()}`;
  const headers = [
    `To: ${email.to}`,
    ...(email.from ? [`From: ${email.from}`] : []),
    ...(email.replyTo ? [`Reply-To: ${email.replyTo}`] : []),
    `Subject: ${encodeHeader(email.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ].join('\r\n');

  const textPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(Buffer.from(email.bodyText, 'utf8').toString('base64')),
  ].join('\r\n');

  const attachmentPart = [
    `--${boundary}`,
    `Content-Type: application/pdf; name="${email.attachment.filename}"`,
    `Content-Disposition: attachment; ${contentDispositionFilename(email.attachment.filename)}`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64(email.attachment.content.toString('base64')),
  ].join('\r\n');

  return `${headers}\r\n\r\n${textPart}\r\n\r\n${attachmentPart}\r\n\r\n--${boundary}--`;
}

export interface SendOutcome {
  outcome: 'accepted' | 'failed';
  gmailMessageId?: string;
  errorDetail?: string;
}

export type MailMode = 'console' | 'file' | 'gmail';

/**
 * getAccessToken is only invoked in 'gmail' mode - console/file modes never touch Google at all,
 * so the entire compose-and-attach path is exercisable without a Google account, credentials, or
 * network access. Default mode is 'console'; never defaults to 'gmail'.
 */
export async function sendComposedEmail(
  email: ComposedEmail,
  getAccessToken?: () => Promise<string>,
): Promise<SendOutcome> {
  const raw = buildRawMimeMessage(email);
  const mode = (process.env.MAIL_MODE || 'console') as MailMode;

  if (mode === 'console') {
    // Exempt from the "don't log full message bodies" rule by design: console mode's entire
    // purpose is showing the developer what would be sent, and nothing actually leaves the
    // machine in this mode.
    console.log('--- MAIL_MODE=console: composed message (nothing sent) ---\n' + raw);
    return { outcome: 'accepted' };
  }

  if (mode === 'file') {
    mkdirSync(OUTBOX_DIR, { recursive: true });
    const path = join(OUTBOX_DIR, `${Date.now()}-${randomUUID()}.eml`);
    writeFileSync(path, raw, 'utf8');
    console.log(`--- MAIL_MODE=file: wrote ${path} (nothing sent) ---`);
    return { outcome: 'accepted' };
  }

  // mode === 'gmail'
  if (!getAccessToken) {
    return { outcome: 'failed', errorDetail: 'No access token provider supplied for gmail mode' };
  }
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    return { outcome: 'failed', errorDetail: err instanceof Error ? err.message : 'Failed to obtain access token' };
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(raw, 'utf8').toString('base64url') }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { outcome: 'failed', errorDetail: body?.error?.message ?? `Gmail API error (${res.status})` };
  }
  const body = (await res.json()) as { id?: string };
  return { outcome: 'accepted', gmailMessageId: body.id };
}
