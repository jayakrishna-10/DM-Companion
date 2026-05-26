import { useRef, useEffect, useState } from 'react'
import { getNoteTypeColor } from '@/types'
import { motion } from 'framer-motion'

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  noteTypes: string[]
  onAddType?: (name: string) => void
}

export function SegmentedControl({ value, onChange, noteTypes, onAddType }: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const [showInput, setShowInput] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const hasMany = noteTypes.length > 5

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const btn = container.querySelector<HTMLButtonElement>(`[data-type="${value}"]`)
    if (btn) {
      setIndicator({
        left: btn.offsetLeft - container.clientLeft + 2,
        width: btn.offsetWidth - 4,
      })
    }
  }, [value, noteTypes])

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
          ref={containerRef}
          className={`relative flex bg-surface-2 rounded-xl p-1 border border-border-subtle flex-1 ${hasMany ? 'overflow-x-auto' : ''}`}
          style={{ scrollbarWidth: 'none' }}
        >
          {noteTypes.map((type) => (
            <button
              key={type}
              data-type={type}
              onClick={() => onChange(type)}
              className={`relative h-8 text-xs font-semibold tracking-wide rounded-lg transition-colors duration-150 z-10 flex items-center justify-center gap-1 flex-shrink-0 ${hasMany ? 'min-w-[70px]' : 'flex-1'}`}
              style={{ color: value === type ? '#fff' : getNoteTypeColor(type) }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getNoteTypeColor(type) }} />
              <span className="truncate max-w-[80px]">{type}</span>
            </button>
          ))}
          <motion.div
            layoutId="segment-bg"
            className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
            style={{ backgroundColor: getNoteTypeColor(value) }}
            initial={false}
            animate={{ left: indicator.left, width: indicator.width }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        </div>
        {onAddType && (
          <button
            onClick={() => setShowInput(!showInput)}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
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
            className="flex-1 h-8 px-3 rounded-lg bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted text-xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            onClick={handleAddType}
            disabled={!newTypeName.trim()}
            className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold disabled:opacity-40 hover:bg-accent/90 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
