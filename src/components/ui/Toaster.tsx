import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0

export function toast(message: string, type: Toast['type'] = 'success') {
  const id = ++toastId
  const event = new CustomEvent('dm-toast', { detail: { id, message, type } })
  window.dispatchEvent(event)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const { id, message, type } = (e as CustomEvent).detail as Toast
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
    }
    window.addEventListener('dm-toast', handler)
    return () => window.removeEventListener('dm-toast', handler)
  }, [])

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg pointer-events-auto glass-strong ${
              t.type === 'success' ? 'text-resolved-light' :
              t.type === 'error' ? 'text-complaint-light' :
              'text-text-secondary'
            }`}
          >
            <span className="mr-2">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}