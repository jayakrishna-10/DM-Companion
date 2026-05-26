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
    <div className="flex flex-col h-full bg-neutral-950">
      <div className="px-4 pt-3 pb-2 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes, equipment..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-neutral-900/60 border border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {entries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-500">No entries found</p>
          </div>
        ) : (
          <div>
            {Array.from(grouped.entries()).map(([date, dateEntries]) => (
              <div key={date} className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                    {formatTimestamp(date)}
                  </h3>
                  <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
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
      </div>

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
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
        active
          ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
          : 'bg-neutral-800/80 text-neutral-400 border-neutral-800 hover:bg-neutral-700/80 hover:border-neutral-700'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      <span>{label}</span>
      <span className={active ? 'text-teal-400' : 'text-neutral-500'}>{count}</span>
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