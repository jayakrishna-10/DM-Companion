import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { LogEntry } from '@/types'
import { getNoteTypeColor } from '@/types'
import type { CSSProperties } from 'react'

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
}

export function TimelineCard({
  entry,
  onClick,
  extra,
  showObjectLink,
  onObjectClick,
}: TimelineCardProps) {
  const { narrative, subs } = parseSubEntries(entry.note)
  const entryColor = getNoteTypeColor(entry.noteType)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="timeline-node group relative mb-3 last:mb-0"
      style={{ '--entry-color': entryColor } as CSSProperties}
    >
      <button
        onClick={onClick}
        className="w-full overflow-hidden rounded-2xl border border-slate-4/70 bg-slate-2/82 text-left shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan/25 hover:bg-slate-2 active:scale-[0.99]"
      >
        <div className="h-1 w-full" style={{ backgroundColor: entryColor }} />
        <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="rounded-md border px-2 py-0.5 text-[11px] font-extrabold"
            style={{ color: entryColor, backgroundColor: `${entryColor}18`, borderColor: `${entryColor}33` }}
          >
            {entry.noteType}
          </span>
          {extra}
          <span className="ml-auto font-data text-[10px] font-semibold text-label">
            {formatDate(entry.date)}
          </span>
        </div>

        {subs.length === 0 && (
          <p className="mb-1 text-sm font-semibold leading-snug text-body">
            {narrative}
          </p>
        )}

        {subs.length > 0 && narrative && (
          <p className="text-sm leading-relaxed text-text-muted">
            {narrative}
          </p>
        )}

        {entry.object && (
          <div className="mt-2 flex items-center gap-1.5 font-data text-[10px] font-semibold text-label">
            {showObjectLink && onObjectClick ? (
              <span
                className="cursor-pointer rounded-md bg-cyan/10 px-1.5 py-0.5 text-cyan-light transition-colors hover:bg-cyan/15"
                onClick={(e) => { e.stopPropagation(); onObjectClick(entry.object) }}
              >
                {entry.object}
              </span>
            ) : (
              <span className="rounded-md bg-slate-3 px-1.5 py-0.5 text-body">{entry.object}</span>
            )}
            {entry.objectGroup && <span className="truncate">{entry.objectGroup}</span>}
          </div>
        )}

        {subs.length > 0 && (
          <div className="mt-3 border-t border-slate-4/60 pt-2.5">
            <div className="space-y-1.5 pl-1">
              {subs.map((sub, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check size={14} className="mt-px flex-shrink-0 text-cyan-light/70" />
                  <span className="text-xs font-medium leading-snug text-body">
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </button>
    </motion.div>
  )
}
