import { NepaliDate } from 'nepali-date-library'
import { financialYearStart, type JurisdictionProfile } from '@quote-engine/engine'

export type RangePreset = 'all' | '7d' | '30d' | 'month' | 'fy' | 'custom'

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  all: 'All time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  month: 'This month',
  fy: 'This financial year',
  custom: 'Custom range',
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatProfileDate(profile: JurisdictionProfile, year: number, month1to12: number, day: number): string {
  return profile.calendar.system === 'bikram_sambat'
    ? `${year}/${pad2(month1to12)}/${pad2(day)}`
    : `${pad2(day)}/${pad2(month1to12)}/${year}`
}

/** Today's calendar date in the tenant's own calendar, as {year, month(1-12), day}. */
function todayParts(profile: JurisdictionProfile): { year: number; month: number; day: number } {
  if (profile.calendar.system === 'bikram_sambat') {
    const today = new NepaliDate()
    return { year: today.getYear(), month: today.getMonth() + 1, day: today.getDate() }
  }
  const today = new Date()
  return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() }
}

/** Adds (or subtracts) whole calendar days, in the tenant's own calendar. */
function addDays(profile: JurisdictionProfile, parts: { year: number; month: number; day: number }, delta: number) {
  if (profile.calendar.system === 'bikram_sambat') {
    const result = new NepaliDate(parts.year, parts.month - 1, parts.day).addDays(delta)
    return { year: result.getYear(), month: result.getMonth() + 1, day: result.getDate() }
  }
  const result = new Date(parts.year, parts.month - 1, parts.day)
  result.setDate(result.getDate() + delta)
  return { year: result.getFullYear(), month: result.getMonth() + 1, day: result.getDate() }
}

/** Last day of the tenant-calendar month containing `parts`. */
function endOfMonth(profile: JurisdictionProfile, parts: { year: number; month: number; day: number }) {
  if (profile.calendar.system === 'bikram_sambat') {
    const days = new NepaliDate(parts.year, parts.month - 1, 1).daysInMonth()
    return { year: parts.year, month: parts.month, day: days }
  }
  const days = new Date(parts.year, parts.month, 0).getDate()
  return { year: parts.year, month: parts.month, day: days }
}

export interface ResolvedRange {
  from: string | null
  to: string | null
}

/**
 * Resolves a preset (or explicit custom bounds) into concrete tenant-calendar date strings.
 * "This month" / "This financial year" are full periods (start through end), not clipped to
 * today, matching how a filing-period filter is normally understood. All arithmetic stays in
 * the tenant's own calendar (Gregorian Date math for AU, NepaliDate for NP) — never a UTC
 * timestamp — since these are calendar dates with no time-of-day component.
 */
export function resolvePreset(
  profile: JurisdictionProfile,
  preset: RangePreset,
  custom?: { from: string | null; to: string | null },
): ResolvedRange {
  if (preset === 'all') return { from: null, to: null }
  if (preset === 'custom') return { from: custom?.from ?? null, to: custom?.to ?? null }

  const today = todayParts(profile)

  if (preset === '7d') {
    const from = addDays(profile, today, -6)
    return {
      from: formatProfileDate(profile, from.year, from.month, from.day),
      to: formatProfileDate(profile, today.year, today.month, today.day),
    }
  }
  if (preset === '30d') {
    const from = addDays(profile, today, -29)
    return {
      from: formatProfileDate(profile, from.year, from.month, from.day),
      to: formatProfileDate(profile, today.year, today.month, today.day),
    }
  }
  if (preset === 'month') {
    const end = endOfMonth(profile, today)
    return {
      from: formatProfileDate(profile, today.year, today.month, 1),
      to: formatProfileDate(profile, end.year, end.month, end.day),
    }
  }
  // fy
  const start = financialYearStart(profile, today)
  const nextStart = { year: start.year + 1, month: start.month, day: start.day }
  const end = addDays(profile, nextStart, -1)
  return {
    from: formatProfileDate(profile, start.year, start.month, start.day),
    to: formatProfileDate(profile, end.year, end.month, end.day),
  }
}
