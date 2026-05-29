import { NavLink, useLocation } from 'react-router'
import { Database, Images } from 'lucide-react'
import { Logs } from '@/pages/Logs'
import { Photos } from '@/pages/Photos'

export function Admin() {
  const location = useLocation()
  const isPhotos = location.pathname.startsWith('/admin/photos')

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="pb-16">
        {isPhotos ? <Photos basePath="/admin/photos" compactHeader /> : <Logs />}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-neutral-900 bg-neutral-950/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-1">
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
    </div>
  )
}
