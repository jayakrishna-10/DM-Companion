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
    <div className="page-shell">
      <div className="content-grid space-y-5">
      <section className="rounded-3xl border border-rose/15 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_38%),linear-gradient(145deg,rgba(28,28,36,0.92),rgba(5,5,7,0.92))] p-4 lg:p-5">
        <p className="section-label text-rose-light">Alert console</p>
        <div className="mt-3 grid grid-cols-3 gap-2 lg:gap-3">
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
      </section>

      <section className="flex gap-2">
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
      </section>

      <section>
        {displayIssues.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-4 bg-slate-2/50 px-6 py-16 text-center">
            <p className="font-display text-xl font-black text-heading">
              {tab === 'open'
                ? 'No open issues'
                : 'No resolved issues yet.'}
            </p>
            <p className="mt-2 text-sm text-text-muted">{tab === 'open' ? 'The plant record is clear right now.' : 'Resolved complaint records will collect here.'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(grouped.entries()).map(([date, dateIssues]) => (
              <div key={date}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="section-label">
                    {formatDate(date)}
                  </h3>
                  <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
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
                          <span className="rounded-md bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-light">
                            Resolved
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
      </section>

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
    <div className="metric-card p-3 lg:p-4">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-[11px] font-bold text-label">{label}</span>
      </div>
      <p className="font-display text-3xl font-black text-heading tabular">{count}</p>
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
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold whitespace-nowrap transition-all ${
        active
          ? 'bg-cyan/10 text-cyan-light border-cyan/30'
          : 'bg-slate-3/80 text-text-muted border-slate-4 hover:text-heading'
      }`}
    >
      <span>{label}</span>
      <span className={active ? 'text-cyan-light' : 'text-label'}>
        {count}
      </span>
    </button>
  )
}
