import type { SyncStatus } from '@/types'
import { Check, Loader2, WifiOff, AlertTriangle } from 'lucide-react'

interface SyncIndicatorProps {
  status: SyncStatus
  lastSyncTime?: string | null
}

export function SyncIndicator({ status, lastSyncTime }: SyncIndicatorProps) {
  const config = {
    synced: { icon: Check, color: 'text-resolved-light', label: 'Synced' },
    syncing: { icon: Loader2, color: 'text-activity-light', label: 'Syncing' },
    offline: { icon: WifiOff, color: 'text-text-muted', label: 'Offline' },
    error: { icon: AlertTriangle, color: 'text-abnormality-light', label: 'Error' },
  }[status]

  const Icon = config.icon

  return (
    <div className="flex items-center gap-1.5">
      <Icon
        size={14}
        className={`${config.color} ${status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {lastSyncTime ? config.label : config.label}
      </span>
    </div>
  )
}