import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ isOpen, onClose, title, children }: SheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e: unknown, info: { offset: { y: number } }) => {
              if (info.offset.y > 100) onClose()
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900/95 border-t border-neutral-800 backdrop-blur-xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-4 pb-3 border-b border-neutral-800/50">
                <h3 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">{title}</h3>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-800/60 text-neutral-500 hover:text-neutral-300">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}