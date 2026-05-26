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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider font-mono">
          {label || formatTimestamp(date)}
        </h3>
        <span className="text-[9px] text-neutral-600 font-medium bg-neutral-800/80 px-1.5 py-0.5 rounded-md border border-neutral-800">
          {entries.length}
        </span>
      </div>

      {/* Timeline with left anchor line */}
      <div className="relative pl-4 border-l border-neutral-800">
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
    <div className="relative pl-4 border-l border-neutral-800">
      {children}
    </div>
  )
}