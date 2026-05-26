import { useMemo, useState } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { useNavigate } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { TimelineCard, TimelineLine } from '@/components/timeline'
import type { LogEntry, OpenIssue } from '@/types'

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function Issues() {
  const { getOpenIssues, removeEntry } = useDatabase()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const issues = useMemo(() => getOpenIssues(), [getOpenIssues])

  const openIssues = useMemo(() => issues.filter(i => !i.resolved), [issues])
  const resolvedIssues = useMemo(() => issues.filter(i => i.resolved), [issues])

  const openComplaints = useMemo(
    () => openIssues.filter(i => i.entry.noteType === 'Complaints').length,
    [openIssues],
  )
  const openAbnormalities = useMemo(
    () => openIssues.filter(i => i.entry.noteType === 'Abnormality').length,
    [openIssues],
  )
  const resolvedCount = resolvedIssues.length

  const displayIssues = tab === 'open' ? openIssues : resolvedIssues

  const grouped = useMemo(() => {
    const map = new Map<string, OpenIssue[]>()
    for (const issue of displayIssues) {
      if (!map.has(issue.entry.date)) map.set(issue.entry.date, [])
      map.get(issue.entry.date)!.push(issue)
    }
    return map
  }, [displayIssues])

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Summary cards */}
      <div className="px-4 pt-4 pb-3">
        <div className="grid grid-cols-3 gap-2">
          <SummaryCard
            label="Open Complaints"
            count={openComplaints}
            color="#EF4444"
          />
          <SummaryCard
            label="Open Abnormalities"
            count={openAbnormalities}
            color="#F97316"
          />
          <SummaryCard
            label="Resolved"
            count={resolvedCount}
            color="#22C55E"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5">
          <TabButton
            label="Open"
            count={openIssues.length}
            active={tab === 'open'}
            onClick={() => setTab('open')}
          />
          <TabButton
            label="Resolved"
            count={resolvedIssues.length}
            active={tab === 'resolved'}
            onClick={() => setTab('resolved')}
          />
        </div>
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {displayIssues.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-neutral-500 text-base">
              {tab === 'open'
                ? 'No open issues — everything looks good!'
                : 'No resolved issues yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(grouped.entries()).map(([date, dateIssues]) => (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
                    {formatDate(date)}
                  </h3>
                  <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
                    {dateIssues.length}
                  </span>
                </div>
                <TimelineLine>
                  <AnimatePresence>
                    {dateIssues.map(issue => (
                      <TimelineCard
                        key={issue.entry.id}
                        entry={issue.entry}
                        onClick={() => {
                          setSelectedEntry(issue.entry)
                          setSheetOpen(true)
                        }}
                        extra={issue.resolved ? (
                          <span className="text-[9px] text-teal-400 font-semibold flex items-center gap-0.5">
                            ✓ Resolved
                          </span>
                        ) : undefined}
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
        onEdit={entry => {
          setSheetOpen(false)
          navigate(`/new?edit=${entry.id}`)
        }}
        onDelete={id => {
          removeEntry(id)
          setSheetOpen(false)
          toast('Entry deleted')
        }}
        onDuplicate={entry => {
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
    <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-neutral-500 truncate">{label}</span>
      </div>
      <p className="text-xl font-bold text-neutral-200">{count}</p>
    </div>
  )
}

/* ─── Tab button ─── */

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-medium whitespace-nowrap transition-all border ${
        active
          ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
          : 'bg-neutral-800/80 text-neutral-500 border-neutral-800'
      }`}
    >
      <span>{label}</span>
      <span className={active ? 'text-teal-400' : 'text-neutral-600'}>
        {count}
      </span>
    </button>
  )
}
