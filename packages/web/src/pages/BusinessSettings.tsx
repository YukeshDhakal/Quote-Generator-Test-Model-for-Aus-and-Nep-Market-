import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AU_PROFILE, NP_PROFILE } from '@quote-engine/engine'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createBusinessProfile,
  getBusiness,
  listBusinesses,
  saveBusiness,
  switchBusiness,
  uploadLogo,
  type BusinessProfile,
} from '../api'

const API_ORIGIN = 'http://localhost:5187'
const JURISDICTIONS: Record<string, string> = { AU: 'Australia (GST)', NP: 'Nepal (VAT)' }

// Every seller identifier across the jurisdictions this business might quote in (v1: AU, NP).
const ALL_IDENTIFIERS = [...AU_PROFILE.sellerIdentifiers, ...NP_PROFILE.sellerIdentifiers].filter(
  (id, index, all) => all.findIndex((other) => other.key === id.key) === index,
)

function BusinessProfiles() {
  const [profiles, setProfiles] = useState<BusinessProfile[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newJurisdiction, setNewJurisdiction] = useState('AU')
  const [creating, setCreating] = useState(false)

  function refresh() {
    listBusinesses()
      .then(setProfiles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load business profiles.'))
  }

  useEffect(refresh, [])

  async function handleSwitch(id: string) {
    setSwitching(id)
    setError(null)
    try {
      await switchBusiness(id)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch business.')
      setSwitching(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) {
      setError('Business name is required.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const created = await createBusinessProfile({ name: newName, jurisdiction: newJurisdiction })
      await switchBusiness(created.id)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business profile.')
      setCreating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your business profiles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          A business is registered in one jurisdiction. To quote in another, create a separate profile for it and
          switch between them here.
        </p>

        {!profiles ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="divide-y rounded-md border">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.jurisdiction ? JURISDICTIONS[p.jurisdiction] ?? p.jurisdiction : 'No jurisdiction set'}
                  </div>
                </div>
                {p.active ? (
                  <span className="text-xs font-medium text-muted-foreground">Active</span>
                ) : (
                  <Button variant="outline" size="sm" disabled={switching === p.id} onClick={() => handleSwitch(p.id)}>
                    {switching === p.id ? 'Switching…' : 'Switch'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {showCreate ? (
          <form onSubmit={handleCreate} className="space-y-3 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="newBizName">Business name</Label>
                <Input id="newBizName" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Jurisdiction</Label>
                <Select items={JURISDICTIONS} value={newJurisdiction} onValueChange={(v) => v && setNewJurisdiction(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(JURISDICTIONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={creating}>
                {creating ? 'Creating…' : 'Create & switch'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}>
            + New business profile
          </Button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}

export function BusinessSettings() {
  const [jurisdiction, setJurisdiction] = useState<string | null>(null)
  const [pendingJurisdiction, setPendingJurisdiction] = useState('AU')
  const [legalName, setLegalName] = useState('')
  const [color, setColor] = useState('#0ea5e9')
  const [termsText, setTermsText] = useState('')
  const [identifiers, setIdentifiers] = useState<Record<string, string>>({})
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    getBusiness()
      .then((b) => {
        setJurisdiction(b.jurisdiction)
        setLegalName(b.legalName ?? '')
        setColor(b.color ?? '#0ea5e9')
        setTermsText(b.termsText ?? '')
        setIdentifiers(b.identifiers ?? {})
        setLogoUrl(b.logoPath ? `${API_ORIGIN}/uploads/${b.logoPath.split(/[\\/]/).pop()}` : null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load business settings.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const settings = await saveBusiness({ legalName, color, termsText, identifiers })
      setJurisdiction(settings.jurisdiction)
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSetJurisdiction() {
    setSaving(true)
    setError(null)
    try {
      const settings = await saveBusiness({ jurisdiction: pendingJurisdiction })
      setJurisdiction(settings.jurisdiction)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set jurisdiction.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const result = await uploadLogo(file)
      setLogoUrl(`${API_ORIGIN}${result.logoUrl}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed.')
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <motion.div
      className="max-w-2xl space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Business settings</h1>
        <p className="text-sm text-muted-foreground">
          These are the fields the PRD calls "configurable per business" — logo, colour, seller details, terms
          text. Tax wording, calendar, and numbering stay jurisdiction-owned and aren't editable here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jurisdiction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {jurisdiction ? (
            <div>
              <div className="flex h-9 w-fit items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                {JURISDICTIONS[jurisdiction] ?? jurisdiction}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Locked — a business is registered in one place. To operate in another jurisdiction, create a
                separate business profile below.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This business has no jurisdiction set yet. Pick one before creating your first quote.
              </p>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select items={JURISDICTIONS} value={pendingJurisdiction} onValueChange={(v) => v && setPendingJurisdiction(v)}>
                    <SelectTrigger className="w-56">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(JURISDICTIONS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={handleSetJurisdiction} disabled={saving}>
                  Set jurisdiction
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal business name</Label>
              <Input id="legalName" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Accent colour</Label>
              <Input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input id="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoChange} />
            </div>
            {logoUrl && (
              <div className="col-span-3">
                <img src={logoUrl} alt="Business logo" className="max-h-16 max-w-[200px]" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seller identifiers</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {ALL_IDENTIFIERS.map((id) => (
              <div key={id.key} className="space-y-2">
                <Label htmlFor={`id-${id.key}`}>{id.label}</Label>
                <Input
                  id={`id-${id.key}`}
                  value={identifiers[id.key] ?? ''}
                  onChange={(e) => setIdentifiers((prev) => ({ ...prev, [id.key]: e.target.value }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms &amp; payment details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="terms">Terms text (printed on every quote/invoice)</Label>
            <Textarea id="terms" rows={4} value={termsText} onChange={(e) => setTermsText(e.target.value)} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {savedAt && <span className="text-sm text-muted-foreground">Saved.</span>}
        </div>
      </form>

      <BusinessProfiles />
    </motion.div>
  )
}
