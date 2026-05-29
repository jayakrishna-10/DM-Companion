import { useRef, useEffect, useState } from 'react'
import { getNoteTypeColor } from '@/types'
import { motion } from 'framer-motion'

/** Known abbreviations for default note types; custom types get first 4 chars + "." */
const KNOWN_SHORT: Record<string, string> = {
  'Activity': 'Act.',
  'Complaints': 'Compl.',
  'Abnormality': 'Abnorm.',
  'Resolved Complaint': 'Resolv.',
}

function getShortLabel(type: string): string {
  if (KNOWN_SHORT[type]) return KNOWN_SHORT[type]
  if (type.length <= 5) return type
  return type.slice(0, 4) + '.'
}

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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          ref={containerRef}
          className="relative flex bg-slate-1 border border-slate-4 rounded-xl p-1 flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {noteTypes.map((type) => (
            <button
              key={type}
              data-type={type}
              onClick={() => onChange(type)}
              className="relative min-h-9 text-xs font-bold tracking-wide rounded-lg transition-colors duration-150 z-10 flex items-center justify-center gap-1.5 flex-1 min-w-0 px-2"
              style={{ color: value === type ? '#fff' : getNoteTypeColor(type) }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getNoteTypeColor(type) }} />
              <span className="sm:hidden truncate">{getShortLabel(type)}</span>
              <span className="hidden sm:inline truncate">{type}</span>
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
            className="flex-shrink-0 min-h-9 min-w-9 rounded-xl bg-slate-3 border border-slate-4 text-label flex items-center justify-center text-xs hover:text-body hover:border-slate-5 transition-colors"
            title="Add note type"
            aria-label="Add note type"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
          </button>
        )}
      </div>
      {showInput && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTypeName}
            onChange={e => setNewTypeName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New note type name..."
            className="flex-1 min-h-9 px-3 rounded-xl bg-slate-1 border border-slate-4 text-body placeholder:text-label/50 text-xs focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_0_3px_var(--color-cyan-glow)]"
          />
          <button
            onClick={handleAddType}
            disabled={!newTypeName.trim()}
            className="min-h-9 px-3 rounded-xl bg-cyan text-obsidian text-xs font-bold disabled:opacity-40 hover:brightness-110 transition-all"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
