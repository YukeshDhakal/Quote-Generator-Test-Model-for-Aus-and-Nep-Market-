import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatDDMMYYYY(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`
}

function parseDDMMYYYY(value: string): Date | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  return Number.isNaN(date.getTime()) ? undefined : date
}

interface GregorianDatePickerProps {
  value: string
  onChange: (value: string) => void
}

export function GregorianDatePicker({ value, onChange }: GregorianDatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseDDMMYYYY(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal text-foreground"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {value || <span className="text-muted-foreground">DD/MM/YYYY</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(formatDDMMYYYY(date))
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
