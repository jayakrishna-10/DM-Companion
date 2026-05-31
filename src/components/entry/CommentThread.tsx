interface CommentThreadProps {
  comment?: string | null
  compact?: boolean
  className?: string
}

export function CommentThread({ comment, compact = false, className = '' }: CommentThreadProps) {
  const text = comment?.trim()
  if (!text) return null

  return (
    <div className={`border-l border-teal-500/20 pl-2.5 ${className}`}>
      <div className="mb-0.5 text-[8px] font-semibold uppercase tracking-wider text-neutral-600">
        Comment
      </div>
      <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} leading-relaxed text-neutral-400 whitespace-pre-wrap`}>
        {text}
      </p>
    </div>
  )
}
