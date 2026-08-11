import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, FileText, LayoutDashboard, LogOut, Settings } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Logo } from './Logo'
import { getBusiness, type BusinessSettings } from '../api'
import { useAuth } from '../lib/auth-context'

export type AppView = 'dashboard' | 'quotes' | 'settings'

interface AppShellProps {
  active: AppView
  onNavigate: (view: AppView) => void
  children: ReactNode
}

const NAV_ITEMS: { key: AppView; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'quotes', label: 'Quotes', icon: FileText },
  { key: 'settings', label: 'Business settings', icon: Settings },
]

const JURISDICTION_LABELS: Record<string, string> = { AU: 'GST 10%', NP: 'VAT 13%' }

function initials(name: string | null, email: string) {
  const source = name?.trim() || email
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppShell({ active, onNavigate, children }: AppShellProps) {
  const { user, business, logout } = useAuth()
  const [settings, setSettings] = useState<BusinessSettings | null>(null)

  useEffect(() => {
    getBusiness()
      .then(setSettings)
      .catch(() => setSettings(null))
  }, [business?.id])

  const jurisdictionLine = settings?.jurisdiction
    ? `${settings.jurisdiction} · ${JURISDICTION_LABELS[settings.jurisdiction] ?? ''}`
    : 'No jurisdiction set'

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="gap-2 px-3 py-3">
          <Logo size={24} />
          <Separator />
          <div className="text-sm font-medium">{business?.name ?? 'Your business'}</div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton isActive={active === item.key} onClick={() => onNavigate(item.key)}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto px-3.5 py-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          {jurisdictionLine}
        </div>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b px-4">
          <SidebarTrigger />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border px-2 py-1.5 pl-3 outline-none hover:bg-muted/50">
              <div className="text-right text-sm leading-tight">
                <div className="font-medium">{user?.name || user?.email}</div>
                <div className="font-mono text-[10.5px] text-muted-foreground">{business?.name}</div>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user ? initials(user.name, user.email) : '?'}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{user ? initials(user.name, user.email) : '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{user?.name || user?.email}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{user?.email}</div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  Business
                </DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{business?.name}</span>
                  </div>
                  <div className="mt-2 rounded-md border p-2">
                    <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      {settings?.jurisdiction ?? '—'}
                    </div>
                    <div className="mt-1 text-xs font-medium">
                      {settings?.jurisdiction ? JURISDICTION_LABELS[settings.jurisdiction] : 'No jurisdiction set'}
                    </div>
                  </div>
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('settings')}>
                <Settings /> Business settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => logout()}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
