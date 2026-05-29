import { NavLink, useLocation } from 'react-router'
import { Database, Images } from 'lucide-react'
import { Logs } from '@/pages/Logs'
import { Photos } from '@/pages/Photos'

export function Admin() {
  const location = useLocation()
  const isPhotos = location.pathname.startsWith('/admin/photos')

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="sticky top-12 z-30 border-b border-neutral-900 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal-400">Admin</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) => `flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/15' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            <Database size={16} />
            Logs
          </NavLink>
          <NavLink
            to="/admin/photos"
            className={({ isActive }) => `flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/15' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            <Images size={16} />
            Photos
          </NavLink>
        </div>
      </div>

      {isPhotos ? <Photos basePath="/admin/photos" compactHeader /> : <Logs />}
    </div>
  )
}
