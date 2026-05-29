import type { SyncStatus } from '@/types'
import { Check, Loader2, WifiOff, AlertTriangle } from 'lucide-react'

interface SyncIndicatorProps {
  status: SyncStatus
  lastSyncTime?: string | null
  onSync?: () => void
}

export function SyncIndicator({ status, lastSyncTime, onSync }: SyncIndicatorProps) {
  const config = {
    synced: { icon: Check, color: 'text-emerald-light', label: 'Synced', surface: 'border-emerald/20 bg-emerald/10' },
    syncing: { icon: Loader2, color: 'text-cyan-light', label: 'Syncing', surface: 'border-cyan/20 bg-cyan/10' },
    offline: { icon: WifiOff, color: 'text-label', label: 'Offline', surface: 'border-slate-4 bg-slate-3/70' },
    error: { icon: AlertTriangle, color: 'text-amber-light', label: 'Error', surface: 'border-amber/20 bg-amber/10' },
  }[status]

  const Icon = config.icon

  return (
    <button
      onClick={onSync}
      disabled={status === 'syncing'}
      className={`flex min-h-10 items-center gap-1.5 rounded-xl border px-3 transition-colors hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${config.surface}`}
      title={status === 'syncing' ? 'Syncing...' : 'Click to sync'}
      aria-label={status === 'syncing' ? 'Sync in progress' : 'Sync with Notion'}
    >
      <Icon
        size={14}
        className={`${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span className={`font-data text-[10px] font-bold uppercase tracking-[0.08em] ${config.color}`}>
        {lastSyncTime ? `${config.label} · ${lastSyncTime}` : config.label}
      </span>
    </button>
  )
}
