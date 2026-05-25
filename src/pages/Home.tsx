import { useMemo, useState } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryRow } from '@/components/entry/EntryRow'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { HomeSkeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/Toaster'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import type { LogEntry } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function Home() {
  const { isReady, entries, removeEntry } = useDatabase()
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const navigate = useNavigate()

  const sortedEntries = useMemo(() => {
    const sorted = new Map<string, LogEntry[]>()
    for (const [date, dateEntries] of entries) {
      sorted.set(date, [...dateEntries].sort((a, b) => b.id - a.id))
    }
    return sorted
  }, [entries])

  const todayKey = new Date().toISOString().split('T')[0]
  const todayEntries = sortedEntries.get(todayKey) || []

  if (!isReady) return <HomeSkeleton />

  return (
    <div className="pb-4">
      <div className="px-4 pt-4 pb-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/new')}
          className="w-full gradient-cta rounded-xl p-4 flex items-center justify-center gap-2 text-white font-semibold shadow-lg shadow-accent/20"
        >
          <Plus size={22} strokeWidth={2.5} />
          Add Log Entry
        </motion.button>
      </div>

      {todayEntries.length > 0 && (
        <div className="px-4 mb-4">
          <DateHeader date={todayKey} count={todayEntries.length} />
          <div className="space-y-2">
            <AnimatePresence>
              {todayEntries.map(entry => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onClick={(e) => { setSelectedEntry(e); setSheetOpen(true) }}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {Array.from(sortedEntries.entries())
        .filter(([date]) => date !== todayKey)
        .slice(0, 7)
        .map(([date, dateEntries]) => (
          <CollapsibleGroup key={date} date={date} entries={dateEntries} onEntryClick={(e) => { setSelectedEntry(e); setSheetOpen(true) }} />
        ))
      }

      {sortedEntries.size === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-text-muted text-base">No entries yet</p>
          <p className="text-text-muted text-sm mt-1">Tap the button above to add your first log entry</p>
        </div>
      )}

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

function DateHeader({ date, count }: { date: string; count: number }) {
  const isTodayDate = date === new Date().toISOString().split('T')[0]
  const label = isTodayDate ? 'Today' : formatDate(date)
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</h2>
      <span className="text-[10px] text-text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">{count}</span>
    </div>
  )
}

function CollapsibleGroup({ date, entries, onEntryClick }: { date: string; entries: LogEntry[]; onEntryClick: (entry: LogEntry) => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="px-4 mb-3">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-2 py-2">
        <motion.svg animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.15 }} width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-muted flex-shrink-0">
          <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex-1 text-left">
          {formatDate(date)}
        </span>
        <span className="text-[10px] text-text-muted font-medium bg-surface-2 px-1.5 py-0.5 rounded">{entries.length}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
            {entries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onClick={onEntryClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}