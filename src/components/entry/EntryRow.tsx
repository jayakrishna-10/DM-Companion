import type { LogEntry } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { motion } from 'framer-motion'

interface EntryRowProps {
  entry: LogEntry
  onClick?: (entry: LogEntry) => void
}

export function EntryRow({ entry, onClick }: EntryRowProps) {
  const truncatedNote = entry.note.length > 55 ? entry.note.slice(0, 55) + '...' : entry.note

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      onClick={() => onClick?.(entry)}
      className="w-full text-left p-3 rounded-lg bg-surface hover:bg-surface-2 border border-border-subtle hover:border-border transition-all duration-150 active:scale-[0.98]"
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge type={entry.noteType} size="sm" />
        <span className="text-sm text-text-primary font-medium truncate flex-1">{truncatedNote}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
        {entry.objectType && <span>{entry.objectType}</span>}
        {entry.objectType && entry.objectGroup && <span>·</span>}
        {entry.objectGroup && <span>{entry.objectGroup}</span>}
        {entry.object && (
          <>
            <span>·</span>
            <span className="text-text-secondary font-medium">{entry.object}</span>
          </>
        )}
      </div>
    </motion.button>
  )
}