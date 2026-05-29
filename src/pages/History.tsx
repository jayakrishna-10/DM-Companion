import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { Search } from 'lucide-react'
import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'
import { toast } from '@/components/ui/Toaster'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import { AnimatePresence } from 'framer-motion'

export function History() {
  const navigate = useNavigate()
  const { filterEntries, counts, removeEntry, noteTypes } = useDatabase()
  const [activeType, setActiveType] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const entries = useMemo(() => {
    const opts: { noteType?: string; search?: string } = {}
    if (activeType !== 'all') opts.noteType = activeType
    if (search.trim()) opts.search = search
    return filterEntries(opts)
  }, [activeType, search, filterEntries])

  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of entries) {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date)!.push(entry)
    }
    return map
  }, [entries])

  return (
    <div className="page-shell">
      <div className="content-grid space-y-5">
        <section className="metric-card p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-1">
            <p className="section-label text-cyan-light">Chronicle view</p>
            <h2 className="font-display text-2xl font-black tracking-tight text-heading">Search every plant event</h2>
            <p className="text-sm text-text-muted">Filter by note type and scan the full field record by date.</p>
          </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-label" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes, equipment..."
            className="w-full min-h-12 rounded-2xl border border-slate-4 bg-slate-1 pl-10 pr-4 text-sm text-body placeholder:text-label/60 transition-all focus:border-cyan/50 focus:outline-none focus:shadow-[0_0_0_3px_var(--color-cyan-glow)]"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <FilterPill label="All" count={counts.all || 0} active={activeType === 'all'} onClick={() => setActiveType('all')} />
          {noteTypes.map(type => (
            <FilterPill
              key={type}
              label={type}
              count={counts[type] || 0}
              active={activeType === type}
              onClick={() => setActiveType(type)}
              type={type}
            />
          ))}
        </div>
        </section>

      <section>
        {entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-4 bg-slate-2/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-heading">No entries found</p>
            <p className="mt-2 text-sm text-text-muted">Try a different note, object, or note type filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-label">
                    {formatTimestamp(date)}
                  </h3>
                  <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
                    {dateEntries.length}
                  </span>
                </div>
                <TimelineLine>
                  <AnimatePresence>
                    {dateEntries.map(entry => (
                      <TimelineCard
                        key={entry.id}
                        entry={entry}
                        onClick={() => { setSelectedEntry(entry); setSheetOpen(true) }}
                        showObjectLink={true}
                        onObjectClick={(objectName) => navigate(`/equipment?object=${encodeURIComponent(objectName)}`)}
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
        onEdit={(entry) => { setSheetOpen(false); navigate(`/new?edit=${entry.id}`) }}
        onDelete={(id) => {
          removeEntry(id)
          setSheetOpen(false)
          toast('Entry deleted')
        }}
        onDuplicate={(entry) => { setSheetOpen(false); navigate(`/new?duplicate=${entry.id}`) }}
      />
      </div>
    </div>
  )
}

function FilterPill({ label, count, active, onClick, type }: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  type?: string
}) {
  const dotColor = type ? getNoteTypeColor(type) : '#A1A1AA'
  return (
    <button
      onClick={onClick}
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold whitespace-nowrap transition-all ${
        active
          ? 'bg-cyan/10 text-cyan-light border-cyan/30'
          : 'bg-slate-3/80 text-text-muted border-slate-4 hover:bg-slate-3 hover:text-heading'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      <span>{label}</span>
      <span className={active ? 'text-cyan-light' : 'text-label'}>{count}</span>
    </button>
  )
}

function formatTimestamp(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  } catch {
    return dateStr
  }
}
