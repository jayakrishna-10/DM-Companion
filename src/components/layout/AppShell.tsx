import { Outlet, NavLink, useLocation } from 'react-router'
import { AlertTriangle, History, Home, ListChecks, PlusCircle, ScrollText, Settings, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { SyncIndicator } from '@/components/ui/SyncIndicator'
import { useDatabase } from '@/hooks/useDatabase'

const mobileTabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/multi', icon: ListChecks, label: 'Multi' },
  { path: '/profiles', icon: Users, label: 'Profiles' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/issues', icon: AlertTriangle, label: 'Issues' },
  { path: '/logs', icon: ScrollText, label: 'Logs' },
]

const desktopNav = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/new', icon: PlusCircle, label: 'New log' },
  { path: '/multi', icon: ListChecks, label: 'Batch entry' },
  { path: '/profiles', icon: Users, label: 'Asset command' },
  { path: '/history', icon: History, label: 'Chronicle' },
  { path: '/issues', icon: AlertTriangle, label: 'Alert console' },
  { path: '/logs', icon: ScrollText, label: 'Telemetry' },
  { path: '/settings', icon: Settings, label: 'System' },
]

function isRouteActive(pathname: string, path: string) {
  return path === '/' ? pathname === '/' : pathname.startsWith(path)
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/new')) return 'Log event'
  if (pathname.startsWith('/multi')) return 'Batch processor'
  if (pathname.startsWith('/profiles')) return 'Asset command center'
  if (pathname.startsWith('/history')) return 'Chronicle'
  if (pathname.startsWith('/issues')) return 'Alert console'
  if (pathname.startsWith('/equipment')) return 'Asset file'
  if (pathname.startsWith('/logs')) return 'Telemetry'
  if (pathname.startsWith('/settings')) return 'System preferences'
  return 'Shift dashboard'
}

export function AppShell() {
  const location = useLocation()
  const { syncStatus, lastSyncTime, syncToNotion } = useDatabase()
  const needsAttention = syncStatus === 'offline' || syncStatus === 'error'

  return (
    <div className="min-h-dvh bg-obsidian text-heading lg:flex">
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-4/70 lg:bg-slate-1/80 lg:px-4 lg:py-5">
        <div className="mb-8">
          <p className="font-data text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-light">DM Companion</p>
          <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-heading">Obsidian Control</h1>
          <p className="mt-1 text-xs leading-relaxed text-label">Local-first plant logbook and asset command surface.</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary navigation">
          {desktopNav.map(item => {
            const active = isRouteActive(location.pathname, item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-cyan text-obsidian shadow-lg shadow-cyan-glow'
                    : 'text-text-muted hover:bg-slate-3/70 hover:text-heading'
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.6 : 1.8} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-4/70 bg-obsidian/70 p-3">
          <p className="font-data text-[10px] font-bold uppercase tracking-[0.18em] text-label">Sync relay</p>
          <div className="mt-2">
            <SyncIndicator status={syncStatus} lastSyncTime={lastSyncTime} onSync={syncToNotion} />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-30 glass-strong lg:border-b lg:border-slate-4/70">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="min-w-0">
              <p className="hidden font-data text-[10px] font-bold uppercase tracking-[0.2em] text-label lg:block">DM Companion</p>
              <h1 className="truncate font-display text-base font-black tracking-tight text-heading lg:text-xl">
                {pageTitle(location.pathname)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NavLink
                to="/settings"
                aria-label="Open system preferences"
                className="hidden min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-4 bg-slate-2 text-label transition-colors hover:border-cyan/30 hover:text-heading sm:inline-flex lg:hidden"
              >
                <Settings size={17} />
              </NavLink>
              <SyncIndicator status={syncStatus} lastSyncTime={lastSyncTime} onSync={syncToNotion} />
            </div>
          </div>
          {needsAttention && (
            <div className={`border-t px-4 py-2 font-data text-[10px] font-bold uppercase tracking-[0.16em] lg:px-6 ${
              syncStatus === 'error'
                ? 'border-amber/20 bg-amber/10 text-amber-light'
                : 'border-slate-4 bg-slate-2 text-label'
            }`}>
              {syncStatus === 'error' ? 'Sync needs attention. Local data remains safe.' : 'Offline mode. Entries and photos save locally.'}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto safe-bottom lg:pb-0">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <NavLink
        to="/new"
        aria-label="Create new log entry"
        className="fixed bottom-[4.85rem] right-4 z-40 inline-flex min-h-14 min-w-14 items-center justify-center rounded-2xl bg-cyan text-obsidian shadow-2xl shadow-cyan-glow transition-transform active:scale-95 lg:hidden"
      >
        <PlusCircle size={25} strokeWidth={2.5} />
      </NavLink>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-4/80 glass-strong lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {mobileTabs.map(tab => {
            const isActive = isRouteActive(location.pathname, tab.path)
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex h-full w-16 flex-col items-center justify-center"
              >
                <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  isActive ? 'text-cyan-light' : 'text-label'
                }`}>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-xl bg-cyan/10 ring-1 ring-cyan/20"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className={`mt-0.5 text-[10px] font-bold ${
                  isActive ? 'text-cyan-light' : 'text-label'
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
