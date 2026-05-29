import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { searchEntries } from '@/db/database'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, PlusCircle } from 'lucide-react'
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
      <div className="page-shell">
        <div className="content-grid">
          <div className="rounded-3xl border border-dashed border-slate-4 bg-slate-2/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-heading">No equipment specified</p>
            <p className="mt-2 text-sm text-text-muted">
              Use the search or navigation to find equipment entries.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="content-grid space-y-5">
      <section className="rounded-3xl border border-slate-4/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_40%),linear-gradient(145deg,rgba(28,28,36,0.95),rgba(5,5,7,0.92))] p-4 shadow-xl shadow-black/25 lg:p-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl text-xs font-bold text-label transition-colors hover:text-heading"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        {meta && (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
            <p className="section-label text-cyan-light">Asset file</p>
            <h1 className="mt-1 font-display text-4xl font-black tracking-tight text-heading">{meta.object}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {meta.objectType && (
                <span className="rounded-lg border border-cyan/20 bg-cyan/10 px-2 py-1 font-data text-[10px] font-bold text-cyan-light">
                  {meta.objectType}
                </span>
              )}
              {meta.objectGroup && (
                <span className="rounded-lg border border-slate-4 bg-slate-3/80 px-2 py-1 font-data text-[10px] font-bold text-label">{meta.objectGroup}</span>
              )}
            </div>
            </div>
            <button
              onClick={() => navigate('/new')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan px-4 text-sm font-black text-obsidian shadow-lg shadow-cyan-glow transition-all hover:brightness-110"
            >
              <PlusCircle size={17} />
              New log
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap gap-2">
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
      </section>

      <section>
        {filteredEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-4 bg-slate-2/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-heading">No entries found</p>
            <p className="mt-2 text-sm text-text-muted">
              {activeFilter !== 'all'
                ? `No ${activeFilter.toLowerCase()} entries for this equipment.`
                : 'This equipment has no log entries yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-label">
                    {formatDate(date)}
                  </h3>
                  <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
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
      </section>

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
      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold whitespace-nowrap transition-all duration-150 ${
        active
          ? 'bg-cyan/10 text-cyan-light border-cyan/30'
          : 'bg-slate-3/80 text-text-muted border-slate-4 hover:border-cyan/20 hover:text-heading'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
      <span className={active ? 'text-cyan-light' : 'text-label'}>{count}</span>
    </button>
  )
}
