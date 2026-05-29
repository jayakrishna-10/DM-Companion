import { AnimatePresence } from 'framer-motion'
import type { LogEntry } from '@/types'

function formatTimestamp(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  } catch {
    return dateStr
  }
}

export interface TimelineGroupProps {
  date: string
  /** Optional custom label (e.g. "Today") */
  label?: string
  entries: LogEntry[]
  children: React.ReactNode
}

export function TimelineGroup({ date, label, entries }: TimelineGroupProps) {
  return (
    <div>
      {/* Date header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="section-label">
          {label || formatTimestamp(date)}
        </h3>
        <span className="rounded-md border border-slate-4 bg-slate-3/80 px-2 py-0.5 font-data text-[10px] font-bold text-label">
          {entries.length}
        </span>
      </div>

      {/* Timeline with left anchor line */}
      <div className="timeline-line">
        <AnimatePresence>
          {/* Cards rendered by parent via children or map */}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Wrapper that provides just the timeline line container —
 *  cards are rendered by the parent inside this container. */
export function TimelineLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="timeline-line">
      {children}
    </div>
  )
}
