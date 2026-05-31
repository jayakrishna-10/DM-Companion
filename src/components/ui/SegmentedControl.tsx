import { useRef, useEffect, useMemo, useState } from 'react'
import { getNoteTypeColor } from '@/types'

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  noteTypes: string[]
  onAddType?: (name: string) => void
}

export function SegmentedControl({ value, onChange, noteTypes, onAddType }: SegmentedControlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showInput, setShowInput] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const columnCount = useMemo(() => Math.max(1, Math.ceil(noteTypes.length / 2)), [noteTypes.length])

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const handleAddType = () => {
    const trimmed = newTypeName.trim()
    if (trimmed && onAddType) {
      onAddType(trimmed)
      setNewTypeName('')
      setShowInput(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddType()
    } else if (e.key === 'Escape') {
      setShowInput(false)
      setNewTypeName('')
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div
          className="grid flex-1 gap-1 rounded-xl border border-neutral-800/50 bg-neutral-900/60 p-1"
          style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
        >
          {noteTypes.map((type) => (
            <button
              key={type}
              type="button"
              data-type={type}
              onClick={() => onChange(type)}
              className="flex min-h-7 min-w-0 items-center justify-center rounded-md border px-1.5 py-1 text-[9px] font-semibold leading-[1.05] tracking-wide transition-all duration-150 hover:bg-neutral-800/80"
              style={{
                backgroundColor: value === type ? `color-mix(in srgb, ${getNoteTypeColor(type)} 14%, transparent)` : 'rgba(38, 38, 38, 0.8)',
                borderColor: value === type ? getNoteTypeColor(type) : 'rgb(38 38 38)',
                color: getNoteTypeColor(type),
              }}
            >
              <span className="text-center">{type}</span>
            </button>
          ))}
        </div>
        {onAddType && (
          <button
            type="button"
            onClick={() => setShowInput(!showInput)}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-neutral-800/80 border-neutral-800 text-neutral-400 flex items-center justify-center text-xs hover:text-neutral-200 transition-colors"
            title="Add note type"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
          </button>
        )}
      </div>
      {showInput && (
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New note type name..."
            className="flex-1 h-8 px-3 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-xs focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20"
          />
          <button
            type="button"
            onClick={handleAddType}
            disabled={!newTypeName.trim()}
            className="h-8 px-3 rounded-lg bg-teal-500 text-white text-xs font-semibold disabled:opacity-40 hover:bg-teal-400 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
