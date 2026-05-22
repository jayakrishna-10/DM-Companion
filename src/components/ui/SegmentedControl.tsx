import type { NoteType } from '@/types'
import { NOTE_TYPES, NOTE_TYPE_COLORS } from '@/types'
import { motion } from 'framer-motion'

interface SegmentedControlProps {
  value: NoteType
  onChange: (value: NoteType) => void
}

const TYPE_LABELS: Record<NoteType, string> = {
  'Activity': 'Act',
  'Complaints': 'Cmpl',
  'Abnormality': 'Abn',
  'Resolved Complaint': 'RC',
}

export function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  const selectedIndex = NOTE_TYPES.indexOf(value)

  return (
    <div className="relative flex bg-surface-2 rounded-xl p-1 border border-border-subtle">
      {NOTE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className="relative flex-1 h-8 text-xs font-semibold tracking-wide rounded-lg transition-colors duration-150 z-10 flex items-center justify-center gap-1"
          style={{ color: value === type ? '#fff' : NOTE_TYPE_COLORS[type] }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: NOTE_TYPE_COLORS[type] }} />
          {TYPE_LABELS[type]}
        </button>
      ))}
      <motion.div
        layoutId="segment-bg"
        className="absolute top-1 bottom-1 rounded-lg"
        style={{ backgroundColor: NOTE_TYPE_COLORS[value] }}
        initial={false}
        animate={{
          left: `${4 + selectedIndex * 25}%`,
          width: 'calc(25% - 4px)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </div>
  )
}