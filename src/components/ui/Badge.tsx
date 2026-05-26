import { getNoteTypeColor, getNoteTypeBg } from '@/types'

interface BadgeProps {
  type: string
  size?: 'sm' | 'md'
}

export function Badge({ type, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md whitespace-nowrap ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
      style={{
        backgroundColor: getNoteTypeBg(type),
        color: getNoteTypeColor(type),
      }}
    >
      <span className="truncate max-w-[100px]">{type}</span>
    </span>
  )
}
