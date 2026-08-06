import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Boxes,
  Users,
  ArrowRightLeft,
  ShoppingCart,
  TrendingDown,
  FileBarChart,
  ShieldCheck,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { cn } from '@/lib/utils'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'
import { Logo } from '@/components/ui/Logo'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Register', icon: Boxes },
  { to: '/custody/exceptions', label: 'Assign/Return', icon: ArrowRightLeft },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/depreciation', label: 'Depreciation', icon: TrendingDown },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
]

const adminNavItems = [{ to: '/users', label: 'Settings', icon: ShieldCheck }]

function NavList({
  items,
  onNavigate,
  groupId,
}: {
  items: typeof navItems
  onNavigate?: () => void
  groupId: string
}) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-3 whitespace-nowrap rounded-radius-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-brand-red-deep' : 'text-text-secondary hover:bg-bg-alt hover:text-text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`${groupId}-active-pill`}
                    className="absolute inset-0 rounded-radius-md bg-brand-red-tint"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </>
            )}
          </NavLink>
        )
      })}
    </>
  )
}

export function Layout() {
  const { logout, isAdmin } = useSimpleAuth()
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const allItems = isAdmin ? [...navItems, ...adminNavItems] : navItems

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-bg-elevated md:flex">
        <div className="flex h-14 items-center border-b border-border px-6">
          <Logo theme={theme} className="w-3/4 h-auto" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavList items={allItems} groupId="desktop-nav" />
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-radius-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-alt hover:text-text-primary"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-radius-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-alt hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-bg-elevated md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo theme={theme} className="w-3/4 h-auto" />
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="rounded-radius-md border border-border bg-bg-alt p-2 text-text-primary hover:bg-border"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                onClick={logout}
                aria-label="Sign out"
                className="rounded-radius-md border border-border bg-bg-alt p-2 text-text-primary hover:bg-border"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-divider px-2 py-2">
            <NavList items={allItems} groupId="mobile-nav" />
          </nav>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
