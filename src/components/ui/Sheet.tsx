import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      prevFocusRef.current = document.activeElement as HTMLElement
      const timer = setTimeout(() => {
        const focusable = panelRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      prevFocusRef.current?.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 z-[80]"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center pointer-events-none">
            <motion.div
              ref={panelRef}
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              onDragEnd={(_e: unknown, info: { offset: { y: number } }) => {
                if (info.offset.y > 120) onClose()
              }}
              className="pointer-events-auto w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl bg-slate-2 border-t sm:border border-slate-4 shadow-2xl max-h-[88vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'sheet-title' : undefined}
              tabIndex={-1}
            >
              <div className="flex justify-center pt-3 pb-2 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-slate-4" />
              </div>
              {title && (
                <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-4/60">
                  <h3 id="sheet-title" className="text-sm font-bold text-heading uppercase tracking-wider font-display">{title}</h3>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-slate-3 text-label hover:text-heading transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="p-4">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
