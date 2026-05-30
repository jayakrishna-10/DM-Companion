import { motion } from 'framer-motion'
import { Check, CloudOff } from 'lucide-react'
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

/** Parse sub-entries from a note string.
 *  Lines starting with "- " or "• " are treated as sub-items.
 *  Everything before the first sub-item is the main narrative.
 */
function parseSubEntries(note: string): { narrative: string; subs: string[] } {
  const lines = note.split('\n')
  const narrativeLines: string[] = []
  const subs: string[] = []
  let hitSubs = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!hitSubs && (trimmed.startsWith('- ') || trimmed.startsWith('• '))) {
      hitSubs = true
    }
    if (hitSubs) {
      subs.push(trimmed.replace(/^[-•]\s*/, ''))
    } else {
      narrativeLines.push(line)
    }
  }

  return { narrative: narrativeLines.join(' ').trim(), subs }
}

export interface TimelineCardProps {
  entry: LogEntry
  onClick: () => void
  /** Extra badge/content to render in the metadata line (e.g. "✓ Resolved") */
  extra?: React.ReactNode
  /** Whether to show the object name as a clickable link */
  showObjectLink?: boolean
  /** Navigate callback for object links — if provided, object names become clickable */
  onObjectClick?: (objectName: string) => void
  /** Hide per-card date when the parent group already labels the date */
  hideDate?: boolean
  /** Show source metadata for faster scanning */
  showSource?: boolean
  /** Show local-only sync state */
  showSyncState?: boolean
}

export function TimelineCard({
  entry,
  onClick,
  extra,
  showObjectLink,
  onObjectClick,
  hideDate,
  showSource,
  showSyncState,
}: TimelineCardProps) {
  const { narrative, subs } = parseSubEntries(entry.note)
  const typeColor = getNoteTypeColor(entry.noteType)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="group relative mb-3 last:mb-0"
    >
      {/* Connected node on the timeline line */}
      <div className="absolute -left-[20.5px] top-[18px] w-2 h-2 rounded-full border-2 border-teal-500 bg-neutral-950 transition-colors group-hover:bg-teal-400" />

      {/* Card body */}
      <button
        onClick={onClick}
        className="relative w-full overflow-hidden text-left p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/50 hover:bg-neutral-900/90 hover:border-neutral-800 transition-all duration-150 active:scale-[0.98]"
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: typeColor }} />
        {/* Metadata line */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md border border-neutral-800 bg-neutral-800/80"
            style={{ color: typeColor }}
          >
            {entry.noteType}
          </span>
          {extra}
          {showSyncState && !entry.synced && (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
              <CloudOff size={10} /> Local
            </span>
          )}
          {!hideDate && (
            <span className="text-[10px] font-mono text-neutral-500 ml-auto">
              {formatDate(entry.date)}
            </span>
          )}
        </div>

        {/* Event title — when no sub-entries, show full narrative as title */}
        {subs.length === 0 && (
          <p className="text-xs font-semibold text-neutral-200 leading-snug mb-1">
            {narrative}
          </p>
        )}

        {/* Narrative body text — when sub-entries exist, show full narrative as body */}
        {subs.length > 0 && narrative && (
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {narrative}
          </p>
        )}

        {/* Object metadata */}
        {(entry.object || (showSource && entry.source)) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-neutral-500 mt-1.5">
            {entry.object && showObjectLink && onObjectClick ? (
              <span
                className="text-teal-400/80 hover:text-teal-400 font-medium cursor-pointer transition-colors"
                onClick={(e) => { e.stopPropagation(); onObjectClick(entry.object) }}
              >
                {entry.object}
              </span>
            ) : entry.object ? (
              <span className="text-neutral-300 font-medium">{entry.object}</span>
            ) : null}
            {showSource && entry.source && (
              <span className="truncate text-neutral-500">
                {entry.object ? '· ' : ''}{entry.source}
              </span>
            )}
          </div>
        )}

        {/* Nested sub-entries (micro-checklist) */}
        {subs.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-neutral-800/50">
            <div className="pl-1.5 space-y-1">
              {subs.map((sub, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Check size={14} className="text-teal-500/60 flex-shrink-0 mt-px" />
                  <span className="text-[10.5px] font-medium text-neutral-300 leading-snug">
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </button>
    </motion.div>
  )
}
