import { getNoteTypeColor } from '@/types'

interface BadgeProps {
  type: string
  size?: 'sm' | 'md'
}

export function Badge({ type, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold whitespace-nowrap ${
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5 rounded-md border border-neutral-800 bg-neutral-800/80' : 'text-[10px] px-2 py-0.5 rounded-md border border-neutral-800 bg-neutral-800/80'
      }`}
      style={{
        color: getNoteTypeColor(type),
      }}
    >
      <span className="truncate max-w-[100px]">{type}</span>
    </span>
  )
}
