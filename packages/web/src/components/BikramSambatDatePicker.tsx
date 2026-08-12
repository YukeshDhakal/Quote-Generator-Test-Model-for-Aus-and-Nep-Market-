import { useState } from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
// Namespace import with a defensive fallback cascade, not a plain named or default import:
// this package's CJS/ESM interop shape differs across the three environments this file actually
// runs in — Vite dev (esbuild pre-bundling: named export works directly), the production client
// build (Rollup), and the SSR build used for prerendering (externalized, raw Node loader: only
// the default-import-as-whole-object shape works). A namespace import resolves in all three; the
// cascade below picks whichever shape is actually present at runtime.
import * as nepaliDateLibraryNs from 'nepali-date-library'
import type { NepaliDate as NepaliDateClass } from 'nepali-date-library'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function resolveNepaliDateClass(): typeof NepaliDateClass {
  const ns = nepaliDateLibraryNs as unknown as Record<string, unknown>
  const fromDefault = ns.default as Record<string, unknown> | undefined
  return (ns.NepaliDate ?? fromDefault?.NepaliDate ?? ns.default) as typeof NepaliDateClass
}

const NepaliDate = resolveNepaliDateClass()

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

// This project's convention: YYYY/MM/DD, matching NP_PROFILE.calendar.format. Month is 1-12
// here (user-facing); the library's getMonth()/getCalendarDays() use 0-11 internally.
function formatBS(year: number, month1to12: number, day: number): string {
  return `${year}/${pad2(month1to12)}/${pad2(day)}`
}

function parseBS(value: string): { year: number; month0: number; day: number } | undefined {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value.trim())
  if (!match) return undefined
  const [, y, m, d] = match
  return { year: Number(y), month0: Number(m) - 1, day: Number(d) }
}

interface BikramSambatDatePickerProps {
  value: string
  onChange: (value: string) => void
}

export function BikramSambatDatePicker({ value, onChange }: BikramSambatDatePickerProps) {
  const [open, setOpen] = useState(false)
  const parsed = parseBS(value)
  const today = new NepaliDate()
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getYear())
  const [viewMonth0, setViewMonth0] = useState(parsed?.month0 ?? today.getMonth())

  const grid = NepaliDate.getCalendarDays(viewYear, viewMonth0)
  const monthName = NepaliDate.getMonthName(viewMonth0)

  function changeMonth(delta: number) {
    let m = viewMonth0 + delta
    let y = viewYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setViewMonth0(m)
    setViewYear(y)
  }

  function pickDay(day: number) {
    onChange(formatBS(viewYear, viewMonth0 + 1, day))
    setOpen(false)
  }

  // Blank cells (0) for the leading days borrowed from the previous month, then this month's days.
  const weeks: number[][] = []
  const cells = [...Array(grid.prevRemainingDays).fill(0), ...grid.currentMonth.days]
  while (cells.length % 7 !== 0) cells.push(0)
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="w-full justify-start font-normal text-foreground">
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {value || <span className="text-muted-foreground">YYYY/MM/DD (B.S.)</span>}
          </Button>
        }
      />
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex items-center justify-between pb-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {monthName} {viewYear}
          </span>
          <Button type="button" variant="ghost" size="icon" onClick={() => changeMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-muted-foreground">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1 text-center">
            {week.map((day, di) =>
              day === 0 ? (
                <div key={di} />
              ) : (
                <button
                  key={di}
                  type="button"
                  onClick={() => pickDay(day)}
                  className={cn(
                    'rounded-md py-1 text-sm hover:bg-muted',
                    parsed?.year === viewYear && parsed?.month0 === viewMonth0 && parsed?.day === day && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                >
                  {day}
                </button>
              ),
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  )
}
