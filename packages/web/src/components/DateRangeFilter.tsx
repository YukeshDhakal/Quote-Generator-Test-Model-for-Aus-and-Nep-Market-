import { X } from 'lucide-react'
import { compareProfileDates, type JurisdictionProfile } from '@quote-engine/engine'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BikramSambatDatePicker } from './BikramSambatDatePicker'
import { GregorianDatePicker } from './GregorianDatePicker'
import { RANGE_PRESET_LABELS, type RangePreset } from '../lib/date-range'

const PRESET_ORDER: RangePreset[] = ['all', '7d', '30d', 'month', 'fy', 'custom']

export interface DateRangeValue {
  preset: RangePreset
  customFrom: string | null
  customTo: string | null
}

interface DateRangeFilterProps {
  profile: JurisdictionProfile
  value: DateRangeValue
  onChange: (next: DateRangeValue) => void
}

export function DateRangeFilter({ profile, value, onChange }: DateRangeFilterProps) {
  const { preset, customFrom, customTo } = value
  const DatePicker = profile.calendar.system === 'bikram_sambat' ? BikramSambatDatePicker : GregorianDatePicker

  const validationError =
    preset === 'custom' && customFrom && customTo && (compareProfileDates(profile, customFrom, customTo) ?? 0) > 0
      ? '"To" date must not be before "From" date.'
      : null

  function setPreset(next: RangePreset) {
    onChange({ preset: next, customFrom: next === 'custom' ? customFrom : null, customTo: next === 'custom' ? customTo : null })
  }

  function clear() {
    onChange({ preset: 'all', customFrom: null, customTo: null })
  }

  const chipLabel = preset === 'custom' ? `${customFrom ?? '…'} – ${customTo ?? '…'}` : RANGE_PRESET_LABELS[preset]

  return (
    <div className="flex flex-col gap-2">
      <Select items={RANGE_PRESET_LABELS} value={preset} onValueChange={(v) => v && setPreset(v as RangePreset)}>
        <SelectTrigger className="w-full min-[420px]:w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_ORDER.map((key) => (
            <SelectItem key={key} value={key}>
              {RANGE_PRESET_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        // Each picker takes the full row on narrow screens so "to" always lands on its own
        // line between them, rather than being stranded next to whichever picker wraps first.
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full min-[420px]:w-[160px]">
            <DatePicker value={customFrom ?? ''} onChange={(v) => onChange({ preset, customFrom: v, customTo })} />
          </div>
          <span className="w-full text-sm text-muted-foreground min-[420px]:w-auto">to</span>
          <div className="w-full min-[420px]:w-[160px]">
            <DatePicker value={customTo ?? ''} onChange={(v) => onChange({ preset, customFrom, customTo: v })} />
          </div>
        </div>
      )}

      {validationError && <p className="text-sm text-destructive">{validationError}</p>}

      {preset !== 'all' && !validationError && (
        <Badge variant="secondary" className="w-fit gap-1.5 py-1">
          {chipLabel}
          <button type="button" onClick={clear} aria-label="Clear date filter" className="hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  )
}
