import type { SyncStatus } from '@/types'
import { Check, Loader2, WifiOff, AlertTriangle } from 'lucide-react'

interface SyncIndicatorProps {
  status: SyncStatus
  lastSyncTime?: string | null
  onSync?: () => void
}

export function SyncIndicator({ status, lastSyncTime, onSync }: SyncIndicatorProps) {
  const config = {
    synced: { icon: Check, color: 'text-resolved-light', label: 'Synced' },
    syncing: { icon: Loader2, color: 'text-activity-light', label: 'Syncing' },
    offline: { icon: WifiOff, color: 'text-text-muted', label: 'Offline' },
    error: { icon: AlertTriangle, color: 'text-abnormality-light', label: 'Error' },
  }[status]

  const Icon = config.icon

  return (
    <button
      onClick={onSync}
      disabled={status === 'syncing'}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
      title={status === 'syncing' ? 'Syncing...' : 'Click to sync'}
    >
      <Icon
        size={14}
        className={`${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {lastSyncTime ? `${config.label} · ${lastSyncTime}` : config.label}
      </span>
    </button>
  )
}