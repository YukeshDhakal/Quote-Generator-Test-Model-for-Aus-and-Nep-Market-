import { parseProfileDate, type DateParts } from './date-compare.js';
import type { JurisdictionProfile } from './types.js';

/**
 * Start-of-financial-year date containing `parts`, in the jurisdiction's own calendar. Shared by
 * `financialYearTag` and by callers that need the actual FY window (e.g. a date-range filter),
 * so the "which side of the FY boundary" logic exists in exactly one place.
 */
export function financialYearStart(profile: JurisdictionProfile, parts: DateParts): DateParts {
  const { startMonth, startDay } = profile.financialYear;
  const beforeStart = parts.month < startMonth || (parts.month === startMonth && parts.day < startDay);
  const startYear = beforeStart ? parts.year - 1 : parts.year;
  return { year: startYear, month: startMonth, day: startDay };
}

/**
 * Financial-year tag as concatenated two-digit start/end years (e.g. "2526" for the year
 * running from 2025 into 2026), computed in the jurisdiction's own calendar so NP's
 * Shrawan-start BS year is never confused with AU's July-start Gregorian year. A date that
 * fails to parse falls back to year 0 rather than throwing, so quote numbering never hard-fails
 * on a malformed date — it just gets an obviously-wrong tag instead.
 */
export function financialYearTag(profile: JurisdictionProfile, date: string): string {
  const parsed = parseProfileDate(profile, date) ?? { year: 0, month: 1, day: 1 };
  const start = financialYearStart(profile, parsed);
  const endYear = start.year + 1;
  const two = (y: number) => String(Math.abs(y)).slice(-2).padStart(2, '0');
  return `${two(start.year)}${two(endYear)}`;
}
