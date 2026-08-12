import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { type Browser } from 'puppeteer';
import { formatAmount, type JurisdictionProfile, type LineItem, type Quote, type QuoteResult } from '@quote-engine/engine';
import type { BusinessSettings } from './business.js';

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function logoDataUri(logoPath: string | null): string | null {
  if (!logoPath || !existsSync(logoPath)) return null;
  const mime = MIME_BY_EXT[extname(logoPath).toLowerCase()];
  if (!mime) return null;
  const data = readFileSync(logoPath).toString('base64');
  return `data:${mime};base64,${data}`;
}

const COLUMN_LABELS: Record<string, string> = {
  sn: 'S.N.',
  product_code: 'Code',
  description: 'Description',
  qty: 'Qty',
  unit_price: 'Unit Price',
  amount: 'Amount',
  total: 'Total',
  warranty: 'Warranty',
};

function columnValue(key: string, item: LineItem, index: number, profile: JurisdictionProfile): string {
  switch (key) {
    case 'sn':
      return String(index + 1);
    case 'product_code':
      return item.productCode || '—';
    case 'description':
      return item.taxable && profile.taxableMarking === 'asterisk' ? `${item.description} *` : item.description;
    case 'qty':
      return String(item.qty);
    case 'unit_price':
    case 'amount':
      return formatAmount(item.unitPrice, profile);
    case 'total':
      return formatAmount(item.qty * item.unitPrice, profile);
    case 'warranty':
      return '—';
    default:
      return '';
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function buildQuoteHtml(
  quote: Quote,
  result: QuoteResult,
  business: BusinessSettings,
  customer: { customerName: string; companyName: string | null; deliveryAddress: string | null; billingAddress: string | null } | null,
): string {
  const profile = quote.jurisdictionProfile;
  const accent = business.color || '#aa3bff';
  const logo = logoDataUri(business.logoPath);

  const columns = profile.lineItemColumns;
  const rows = quote.lineItems
    .map(
      (item, index) => `
      <tr>
        ${columns.map((col) => `<td>${escapeHtml(columnValue(col, item, index, profile))}</td>`).join('')}
      </tr>`,
    )
    .join('');

  const sellerIdentifiers = profile.sellerIdentifiers
    .map(
      (id) =>
        `<div class="identifier"><span>${escapeHtml(id.label)}: ${escapeHtml(business.identifiers[id.key] || '—')}</span></div>`,
    )
    .join('');

  const totalsRows: string[] = [
    `<tr><td>${escapeHtml(result.labels.subtotalLabel)}</td><td>${formatAmount(result.totals.lineSubtotal, profile)}</td></tr>`,
  ];
  if (result.totals.orderDiscountAmount > 0) {
    totalsRows.push(
      `<tr><td>Order discount</td><td>-${formatAmount(result.totals.orderDiscountAmount, profile)}</td></tr>`,
    );
  }
  if (result.totals.deliveryAmount > 0) {
    totalsRows.push(`<tr><td>Delivery</td><td>${formatAmount(result.totals.deliveryAmount, profile)}</td></tr>`);
  }
  if (result.documentType.showTax) {
    totalsRows.push(
      `<tr><td>${escapeHtml(result.labels.taxLabel)}</td><td>${formatAmount(result.totals.taxAmount, profile)}</td></tr>`,
    );
  }
  totalsRows.push(
    `<tr class="grand"><td>${escapeHtml(result.labels.grandTotalLabel)}</td><td>${formatAmount(result.totals.grandTotal, profile)}</td></tr>`,
  );

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${accent}; padding-bottom: 16px; margin-bottom: 20px; }
  .header .logo img { max-height: 64px; max-width: 220px; }
  .header .seller { text-align: right; }
  .header .seller .legal-name { font-weight: 700; font-size: 15px; }
  .identifier span { font-size: 11px; color: #555; }
  .doc-title { font-size: 22px; font-weight: 700; color: ${accent}; margin: 0 0 4px; }
  .doc-meta { font-size: 12px; color: #555; }
  .blocks { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin: 0 0 4px; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.items th, table.items td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; }
  table.items th { background: #f5f5f5; }
  .taxable-legend { font-size: 10px; color: #888; margin-top: -12px; margin-bottom: 20px; }
  table.totals { width: 320px; margin-left: auto; border-collapse: collapse; }
  table.totals td { padding: 4px 8px; font-size: 12px; }
  table.totals td:last-child { text-align: right; }
  table.totals tr.grand td { font-weight: 700; border-top: 1px solid #333; padding-top: 8px; }
  .words { font-style: italic; font-size: 11px; color: #555; margin-top: 10px; }
  .terms { margin-top: 28px; font-size: 11px; color: #555; white-space: pre-wrap; border-top: 1px solid #e0e0e0; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">${logo ? `<img src="${logo}" />` : ''}</div>
    <div class="seller">
      <div class="legal-name">${escapeHtml(business.legalName || '')}</div>
      ${sellerIdentifiers}
    </div>
  </div>

  <div class="doc-title">${escapeHtml(result.documentType.title)} ${escapeHtml(quote.quoteNumber)}</div>
  <div class="doc-meta">Date: ${escapeHtml(quote.date)}${profile.validityDays ? ` &middot; Valid for ${profile.validityDays} days` : ''}</div>

  <div class="blocks">
    <div class="block">
      <h3>Customer</h3>
      <div>${escapeHtml(customer?.customerName ?? '')}</div>
      ${customer?.companyName ? `<div>${escapeHtml(customer.companyName)}</div>` : ''}
    </div>
    ${
      customer?.billingAddress
        ? `<div class="block"><h3>Billing address</h3><div>${escapeHtml(customer.billingAddress)}</div></div>`
        : ''
    }
    ${
      customer?.deliveryAddress
        ? `<div class="block"><h3>Delivery address</h3><div>${escapeHtml(customer.deliveryAddress)}</div></div>`
        : ''
    }
  </div>

  <table class="items">
    <thead><tr>${columns.map((col) => `<th>${escapeHtml(COLUMN_LABELS[col] ?? col)}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${profile.taxableMarking === 'asterisk' ? '<div class="taxable-legend">* denotes a taxable item</div>' : ''}

  <table class="totals">${totalsRows.join('')}</table>
  ${result.amountInWords ? `<div class="words">${escapeHtml(result.amountInWords)}</div>` : ''}

  ${business.termsText ? `<div class="terms">${escapeHtml(business.termsText)}</div>` : ''}
</body>
</html>`;
}

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    // The container runs as root (no USER directive in the Dockerfile), and Chromium refuses to
    // start sandboxed as root - without --no-sandbox this rejects with "Failed to launch the
    // browser process! Running as root without --no-sandbox is not supported" on every attempt.
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    browserPromise.catch(() => {
      // Don't let a launch failure permanently wedge PDF generation - without this, the first
      // failed attempt caches the rejected promise forever and every later call reuses it.
      browserPromise = null;
    });
  }
  return browserPromise;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_DIR = join(__dirname, '..', 'data', 'pdfs');
mkdirSync(PDF_DIR, { recursive: true });

export async function renderQuotePdf(quoteId: string, html: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
    const outPath = join(PDF_DIR, `${quoteId}.pdf`);
    writeFileSync(outPath, pdfBuffer);
    return outPath;
  } finally {
    await page.close();
  }
}
