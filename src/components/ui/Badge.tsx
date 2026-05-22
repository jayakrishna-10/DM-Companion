import type { NoteType } from '@/types'
import { NOTE_TYPE_BG, NOTE_TYPE_COLORS } from '@/types'

interface BadgeProps {
  type: NoteType
  size?: 'sm' | 'md'
}

const TYPE_LABELS: Record<NoteType, string> = {
  'Activity': 'Activity',
  'Complaints': 'Complaint',
  'Abnormality': 'Abnormality',
  'Resolved Complaint': 'Resolved',
}

export function Badge({ type, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md whitespace-nowrap ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
      style={{
        backgroundColor: NOTE_TYPE_BG[type],
        color: NOTE_TYPE_COLORS[type],
      }}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}