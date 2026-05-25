import { useMemo, useState } from 'react'
import { useDatabase } from '@/hooks/useDatabase'
import { Badge } from '@/components/ui/Badge'
import { EntryDetailSheet } from '@/components/entry/EntryDetailSheet'
import { toast } from '@/components/ui/Toaster'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
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

  return (
    <div className="flex flex-col h-full">
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
            <p className="text-text-muted text-base">
              {tab === 'open'
                ? 'No open issues — everything looks good!'
                : 'No resolved issues yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {displayIssues.map(issue => (
                <IssueCard
                  key={issue.entry.id}
                  issue={issue}
                  onClick={() => {
                    setSelectedEntry(issue.entry)
                    setSheetOpen(true)
                  }}
                />
              ))}
            </AnimatePresence>
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-accent/20 text-accent-light border border-accent/30'
          : 'bg-surface-2 text-text-secondary border border-border-subtle hover:border-border'
      }`}
    >
      <span>{label}</span>
      <span className={active ? 'text-accent-light' : 'text-text-muted'}>
        {count}
      </span>
    </button>
  )
}

/* ─── Issue card ─── */

function IssueCard({
  issue,
  onClick,
}: {
  issue: OpenIssue
  onClick: () => void
}) {
  const { entry, resolved } = issue
  const truncatedNote =
    entry.note.length > 80
      ? entry.note.slice(0, 80) + '...'
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
        {resolved && (
          <span className="text-[10px] text-green-400 font-semibold flex items-center gap-0.5">
            ✓ Resolved
          </span>
        )}
        <span className="text-xs text-text-muted ml-auto">
          {formatDate(entry.date)}
        </span>
      </div>
      <p className="text-sm text-text-primary leading-relaxed mb-2">
        {truncatedNote}
      </p>
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        {entry.objectType && <span>{entry.objectType}</span>}
        {entry.objectType && entry.objectGroup && <span>·</span>}
        {entry.objectGroup && <span>{entry.objectGroup}</span>}
        {entry.object && (
          <>
            <span>·</span>
            <span className="text-text-secondary font-medium">
              {entry.object}
            </span>
          </>
        )}
      </div>
    </motion.button>
  )
}
