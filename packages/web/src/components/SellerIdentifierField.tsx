import type { JurisdictionProfile } from '@quote-engine/engine'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SellerIdentifierFieldProps {
  /** The tenant's own jurisdiction profile — never a cross-jurisdiction list. */
  profile: JurisdictionProfile
  /** Currently selected identifier key (e.g. 'PAN' vs 'VAT_REG'). Falls back to the profile's
      first option if null/unrecognized, matching how the API side falls back for pre-migration rows. */
  type: string | null
  onTypeChange: (key: string) => void
  value: string
  onValueChange: (value: string) => void
  error?: string | null
}

/**
 * The single place every surface (Business Settings today; future PDF-template pickers,
 * onboarding, etc.) goes to render/collect a tenant's seller identifier. Label, format hint, and
 * required-ness all come from the jurisdiction profile — nothing here hardcodes "ABN"/"PAN"/etc.
 * A dropdown only appears when the jurisdiction defines more than one identifier type; a single-
 * option jurisdiction (e.g. AU today) just shows the one field.
 */
export function SellerIdentifierField({
  profile,
  type,
  onTypeChange,
  value,
  onValueChange,
  error,
}: SellerIdentifierFieldProps) {
  const options = profile.sellerIdentifiers
  if (options.length === 0) return null

  const active = options.find((option) => option.key === type) ?? options[0]

  return (
    <div className="space-y-3">
      {options.length > 1 && (
        <div className="space-y-2">
          <Label>Identifier type</Label>
          <Select
            items={Object.fromEntries(options.map((option) => [option.key, option.label]))}
            value={active.key}
            onValueChange={(v) => v && onTypeChange(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="seller-identifier-value">{active.label}</Label>
        <Input
          id="seller-identifier-value"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={active.formatDescription}
        />
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {active.required ? 'Required' : 'Optional'} — {active.formatDescription}
          </p>
        )}
      </div>
    </div>
  )
}
