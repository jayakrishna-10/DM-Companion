import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { searchEntries } from '@/db/database'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'

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
  const { removeEntry, noteTypes } = useDatabase()

  const objectName = searchParams.get('object')

  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')

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

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return entries
    return entries.filter(e => e.noteType === activeFilter)
  }, [entries, activeFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    const sorted = [...filteredEntries].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    )
    for (const entry of sorted) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [filteredEntries])

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
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Back button + header */}
      <div className="px-4 pt-3 pb-2 space-y-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {meta && (
          <div>
            <h1 className="text-xl font-bold text-neutral-200">{meta.object}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {meta.objectType && (
                <span className="text-[9px] font-medium text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
                  {meta.objectType}
                </span>
              )}
              {meta.objectGroup && (
                <span className="text-[10px] text-neutral-500">{meta.objectGroup}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterPill
            label="All"
            count={entries.length}
            color="#737373"
            active={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
          />
          {noteTypes.map((type) => {
            const count = typeCounts[type] || 0
            if (count === 0) return null
            return (
              <FilterPill
                key={type}
                label={type}
                count={count}
                color={getNoteTypeColor(type)}
                active={activeFilter === type}
                onClick={() => setActiveFilter(activeFilter === type ? 'all' : type)}
              />
            )
          })}
        </div>
      </div>

      {/* Compact Timeline */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-500 text-sm">No entries found</p>
            <p className="text-neutral-600 text-[11px] mt-1">
              {activeFilter !== 'all'
                ? `No ${activeFilter.toLowerCase()} entries for this equipment.`
                : 'This equipment has no log entries yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                    {formatDate(date)}
                  </h3>
                  <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
                    {dateEntries.length}
                  </span>
                </div>
                <TimelineLine>
                  <AnimatePresence>
                    {dateEntries.map((entry) => (
                      <TimelineCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => {
                          setSelectedEntry(entry)
                          setSheetOpen(true)
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </TimelineLine>
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


/* ─── Filter pill (compact) ─── */

function FilterPill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string
  count: number
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all duration-150 border ${
        active
          ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
          : 'bg-neutral-800/80 text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-400'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
      <span className={active ? 'text-teal-400' : 'text-neutral-600'}>{count}</span>
    </button>
  )
}