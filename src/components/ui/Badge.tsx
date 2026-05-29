import { getNoteTypeColor } from '@/types'

interface BadgeProps {
  type: string
  size?: 'sm' | 'md'
}

export function Badge({ type, size = 'sm' }: BadgeProps) {
  const color = getNoteTypeColor(type)
  return (
    <span
      className={`inline-flex items-center font-bold whitespace-nowrap ${
        size === 'sm' ? 'text-[11px] px-2 py-0.5 rounded-md' : 'text-xs px-2.5 py-1 rounded-lg'
      }`}
      style={{
        color,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}33`,
      }}
    >
      <span className="truncate max-w-[120px]">{type}</span>
    </span>
  )
}
