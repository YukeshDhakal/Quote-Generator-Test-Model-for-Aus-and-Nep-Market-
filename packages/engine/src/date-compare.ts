import type { JurisdictionProfile } from './types.js';

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/**
 * Parses a date string in the jurisdiction's own calendar format (DD/MM/YYYY gregorian,
 * YYYY/MM/DD bikram_sambat) into numeric parts — never via `new Date()`, which would
 * misinterpret BS digits as a Gregorian date or introduce timezone conversion for a value
 * that has no time-of-day component at all.
 */
export function parseProfileDate(profile: JurisdictionProfile, date: string): DateParts | null {
  if (profile.calendar.system === 'bikram_sambat') {
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(date.trim());
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date.trim());
  if (!match) return null;
  return { year: Number(match[3]), month: Number(match[2]), day: Number(match[1]) };
}

function toComparableKey(parts: DateParts): number {
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

/**
 * Compares two dates in the jurisdiction's own calendar. Returns negative if `a` is earlier,
 * positive if later, 0 if equal, or `null` if either date fails to parse — callers decide how
 * to treat an unparseable date rather than this function silently guessing.
 */
export function compareProfileDates(profile: JurisdictionProfile, a: string, b: string): number | null {
  const partsA = parseProfileDate(profile, a);
  const partsB = parseProfileDate(profile, b);
  if (!partsA || !partsB) return null;
  return toComparableKey(partsA) - toComparableKey(partsB);
}

/**
 * Inclusive range predicate in the jurisdiction's own calendar. Either bound may be null/undefined
 * for an open-ended side. A `date` that fails to parse is excluded rather than throwing.
 */
export function isWithinProfileDateRange(
  profile: JurisdictionProfile,
  date: string,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  const parts = parseProfileDate(profile, date);
  if (!parts) return false;
  const key = toComparableKey(parts);
  if (from) {
    const fromParts = parseProfileDate(profile, from);
    if (fromParts && key < toComparableKey(fromParts)) return false;
  }
  if (to) {
    const toParts = parseProfileDate(profile, to);
    if (toParts && key > toComparableKey(toParts)) return false;
  }
  return true;
}
