import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { searchEntries } from '@/db/database'
import { Badge } from '@/components/ui/Badge'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import type { LogEntry } from '@/types'
import { NOTE_TYPES, NOTE_TYPE_COLORS } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function Equipment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { removeEntry } = useDatabase()

  const objectName = searchParams.get('object')

  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const entries = useMemo(() => {
    if (!objectName) return []
    const raw = searchEntries(objectName)
    const lowerQuery = objectName.toLowerCase()
    return raw.filter(
      (e) => e.object && e.object.toLowerCase() === lowerQuery,
    )
  }, [objectName])

  const meta = useMemo(() => {
    if (entries.length === 0) return null
    const first = entries[0]
    return {
      object: first.object,
      objectGroup: first.objectGroup,
      objectType: first.objectType,
    }
  }, [entries])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of entries) {
      const t = entry.noteType
      counts[t] = (counts[t] || 0) + 1
    }
    return counts
  }, [entries])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    const sorted = [...entries].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    )
    for (const entry of sorted) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [entries])

  if (!objectName) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-24">
          <div className="py-16 text-center">
            <p className="text-text-muted text-base">No equipment specified</p>
            <p className="text-text-muted text-sm mt-1">
              Use the search or navigation to find equipment entries.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Back button + header */}
      <div className="px-4 pt-3 pb-2 space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {meta && (
          <div>
            <h1 className="text-xl font-bold text-text-primary">{meta.object}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {meta.objectType && (
                <span className="text-xs text-text-secondary font-medium bg-surface-2 px-2 py-0.5 rounded-md border border-border-subtle">
                  {meta.objectType}
                </span>
              )}
              {meta.objectGroup && (
                <span className="text-xs text-text-muted">{meta.objectGroup}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-4 gap-2">
          <SummaryCard label="Total" count={entries.length} color="#A1A1AA" />
          {NOTE_TYPES.map((type) => (
            <SummaryCard
              key={type}
              label={type === 'Resolved Complaint' ? 'Resolved' : type}
              count={typeCounts[type] || 0}
              color={NOTE_TYPE_COLORS[type]}
            />
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-text-muted text-base">No entries found</p>
            <p className="text-text-muted text-sm mt-1">
              This equipment has no log entries yet.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {formatDate(date)}
                  </h3>
                  <span className="text-[10px] text-text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">
                    {dateEntries.length}
                  </span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {dateEntries.map((entry) => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => {
                          setSelectedEntry(entry)
                          setSheetOpen(true)
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EntryDetailSheet
        entry={selectedEntry}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onEdit={(entry) => {
          setSheetOpen(false)
          navigate(`/new?edit=${entry.id}`)
        }}
        onDelete={(id) => {
          removeEntry(id)
          setSheetOpen(false)
          toast('Entry deleted')
        }}
        onDuplicate={(entry) => {
          setSheetOpen(false)
          navigate(`/new?duplicate=${entry.id}`)
        }}
      />
    </div>
  )
}

/* ─── Summary card ─── */

function SummaryCard({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: string
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-text-muted truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{count}</p>
    </div>
  )
}

/* ─── Entry card ─── */

function EntryCard({
  entry,
  onClick,
}: {
  entry: LogEntry
  onClick: () => void
}) {
  const truncatedNote =
    entry.note.length > 120
      ? entry.note.slice(0, 120) + '...'
      : entry.note

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-surface hover:bg-surface-2 border border-border-subtle hover:border-border transition-all duration-150 active:scale-[0.98]"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge type={entry.noteType} size="sm" />
        <span className="text-xs text-text-muted ml-auto">
          {formatDate(entry.date)}
        </span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed mb-2">
        {truncatedNote}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        {entry.source && (
          <>
            <span>{entry.source}</span>
            <span>·</span>
          </>
        )}
        <span className="text-text-secondary font-medium">
          {entry.object}
        </span>
      </div>
    </motion.button>
  )
}
