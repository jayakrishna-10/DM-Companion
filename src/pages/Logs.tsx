import { useState, useEffect } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { toast } from '@/components/ui/Toaster'
import { Button } from '@/components/ui/Button'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Database,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react'
import type { SyncLog } from '@/types'

/* ─── Helpers ─── */

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/* ─── Component ─── */

export function Logs() {
  const { dbStats, syncLogs, clearLogs, refreshLogs } = useDatabase()
  const [confirmClear, setConfirmClear] = useState(false)

  // Refresh on mount
  useEffect(() => {
    refreshLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    clearLogs()
    toast('Sync logs cleared', 'success')
    setConfirmClear(false)
  }

  const handleRefresh = () => {
    refreshLogs()
    toast('Stats refreshed', 'info')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-24 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-accent" />
            <h1 className="text-lg font-bold text-text-primary">Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleRefresh}>
              <RefreshCw size={14} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant={confirmClear ? 'danger' : 'ghost'}
              onClick={handleClear}
            >
              <Trash2 size={14} />
              {confirmClear ? 'Confirm?' : 'Clear Logs'}
            </Button>
          </div>
        </div>

        {/* ── Section 1: Database Statistics ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Database Statistics
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Total Entries"
              value={dbStats?.totalEntries ?? 0}
              sub={`${dbStats?.syncedEntries ?? 0} synced · ${dbStats?.unsyncedEntries ?? 0} unsynced`}
            />
            <StatCard label="DB Size" value={dbStats ? `${dbStats.dbSizeKB} KB` : '—'} />
            <StatCard
              label="Tags"
              value={dbStats?.totalTags ?? 0}
              sub={[
                `${dbStats?.noteTypeCount ?? 0} types`,
                `${dbStats?.sourceTagCount ?? 0} sources`,
                `${dbStats?.objectTypeTagCount ?? 0} obj.types`,
                `${dbStats?.objectGroupTagCount ?? 0} obj.groups`,
              ].join(' · ')}
            />
            <StatCard label="Sync Logs" value={dbStats?.syncLogCount ?? 0} />
          </div>
        </section>

        {/* ── Section 2: Sync History ── */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Sync History
          </h2>
          {syncLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={32} className="mx-auto text-text-muted/40 mb-2" />
              <p className="text-sm text-text-muted">No sync logs yet</p>
              <p className="text-xs text-text-muted/60 mt-1">
                Sync logs appear after a Notion sync completes.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {syncLogs.map((log, i) => (
                  <SyncLogCard key={log.id ?? i} log={log} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/* ─── Stat Card ─── */

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="glass rounded-xl p-3">
      <span className="text-xs text-text-muted block mb-0.5">{label}</span>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && (
        <p className="text-[10px] text-text-muted/70 mt-0.5 leading-tight">{sub}</p>
      )}
    </div>
  )
}

/* ─── Sync Log Card ─── */

function SyncLogCard({ log }: { log: SyncLog }) {
  const isError = log.status === 'error'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="rounded-xl border border-border-subtle bg-surface p-3 space-y-2"
    >
      {/* Top row: timestamp + status + duration */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={14} className="text-text-muted flex-shrink-0" />
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {formatTimestamp(log.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              isError
                ? 'bg-complaint/10 text-complaint-light'
                : 'bg-resolved/10 text-resolved-light'
            }`}
          >
            {isError ? (
              <XCircle size={11} />
            ) : (
              <CheckCircle size={11} />
            )}
            {isError ? 'Error' : 'Success'}
          </span>
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <ArrowUpDown size={11} />
            {formatDuration(log.durationMs)}
          </span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
        <span>Pulled: <span className="text-text-secondary font-medium">{log.pulled}</span></span>
        <span>Pushed: <span className="text-text-secondary font-medium">{log.pushed}</span></span>
        <span>Failed: <span className="text-complaint-light font-medium">{log.failed}</span></span>
        <span>Dups skipped: <span className="text-text-secondary font-medium">{log.duplicatesSkipped}</span></span>
        <span>Deleted: <span className="text-text-secondary font-medium">{log.deleted}</span></span>
        <span>Tags: <span className="text-text-secondary font-medium">{log.tagsUpserted}</span></span>
      </div>

      {/* Error message */}
      {isError && log.error && (
        <p className="text-[11px] text-complaint-light leading-relaxed bg-complaint/5 rounded-lg px-2 py-1.5">
          {log.error}
        </p>
      )}
    </motion.div>
  )
}
