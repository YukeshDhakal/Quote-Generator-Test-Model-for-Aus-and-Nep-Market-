export type SniffedImageType = 'png' | 'jpeg' | 'webp' | 'svg';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const BOM = '﻿';

// SVG is XML text, not a fixed binary signature - check the first 2KB (after stripping a
// possible UTF-8 BOM) for an <svg tag, matching how browsers/other tools content-sniff SVG.
function looksLikeSvg(buf: Buffer): boolean {
  let head = buf.subarray(0, 2048).toString('utf8');
  if (head.startsWith(BOM)) head = head.slice(1);
  head = head.trimStart();
  return /^(<\?xml[^>]*\?>\s*)?(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(head);
}

/** Identifies an image's real type from its bytes, ignoring whatever the client claimed via the
 * multipart Content-Type header or the uploaded filename's extension - both are attacker-
 * controlled and don't have to match the actual bytes. Returns null if the bytes don't match any
 * accepted format. */
export function sniffImageType(buf: Buffer): SniffedImageType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_MAGIC)) return 'png';
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG_MAGIC)) return 'jpeg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  if (looksLikeSvg(buf)) return 'svg';
  return null;
}

export function extensionForImageType(type: SniffedImageType): string {
  return type === 'jpeg' ? '.jpg' : `.${type}`;
}
