import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSimpleAuth } from '@/contexts/SimpleAuthContext'
import { cn } from '@/lib/utils'
import { applyTheme, getStoredTheme } from '@/lib/theme'
import type { Theme } from '@/lib/theme'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/assets', label: 'Assets' },
  { to: '/employees', label: 'Employees' },
  { to: '/custody/exceptions', label: 'Exceptions' },
  { to: '/purchases', label: 'Purchases' },
  { to: '/depreciation', label: 'Depreciation' },
  { to: '/audit', label: 'Audit' },
  { to: '/reports', label: 'Reports' },
]

const adminNavItems = [{ to: '/users', label: 'Users' }]

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

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg-elevated shadow-sm">
        <div className="flex h-14 items-center justify-between px-6">
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium text-text-secondary hover:text-text-primary',
                    isActive && 'text-text-strong'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAdmin &&
              adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'text-sm font-medium text-text-secondary hover:text-text-primary',
                      isActive && 'text-text-strong'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-radius-md border border-border bg-bg-alt px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-border"
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              onClick={logout}
              className="rounded-radius-md border border-border bg-bg-alt px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-border"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
