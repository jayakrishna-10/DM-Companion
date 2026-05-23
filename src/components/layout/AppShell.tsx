import { Outlet, NavLink, useLocation } from 'react-router'
import { Home, Plus, ListChecks, History, Settings } from 'lucide-react'
import { motion } from 'framer-motion'
import { SyncIndicator } from '@/components/ui/SyncIndicator'
import { useDatabase } from '@/hooks/useDatabase'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/new', icon: Plus, label: 'New' },
  { path: '/multi', icon: ListChecks, label: 'Multi' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function AppShell() {
  const location = useLocation()
  const { syncStatus, lastSyncTime, syncToNotion } = useDatabase()

  return (
    <div className="flex flex-col min-h-dvh bg-bg text-text-primary">
      <header className="sticky top-0 z-30 glass-strong">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-base font-bold gradient-text">DM Companion</h1>
          <SyncIndicator status={syncStatus} lastSyncTime={lastSyncTime} onSync={syncToNotion} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto safe-bottom">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border-subtle">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map(tab => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path)
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className="relative flex flex-col items-center justify-center w-16 h-full"
              >
                <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted'
                }`}>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-accent/10 rounded-lg"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? 'text-accent' : 'text-text-muted'
                }`}>
                  {tab.label}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}