import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryRow } from '@/components/entry/EntryRow'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { Search } from 'lucide-react'
import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'
import { toast } from '@/components/ui/Toaster'

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
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-2 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes, equipment..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
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
            <p className="text-text-muted">No entries found</p>
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
                  {dateEntries.map(entry => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onClick={(e) => { setSelectedEntry(e); setSheetOpen(true) }}
                    />
                  ))}
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
        active
          ? 'bg-accent/20 text-accent-light border border-accent/30'
          : 'bg-surface-2 text-text-secondary border border-border-subtle hover:border-border'
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
      <span>{label}</span>
      <span className={active ? 'text-accent-light' : 'text-text-muted'}>{count}</span>
    </button>
  )
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}