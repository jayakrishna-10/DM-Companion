import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0

// eslint-disable-next-line react-refresh/only-export-components
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
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }
    window.addEventListener('dm-toast', handler)
    return () => window.removeEventListener('dm-toast', handler)
  }, [])

  const iconFor = (type: Toast['type']) => {
    if (type === 'success') return <CheckCircle2 size={16} className="text-emerald-light shrink-0" aria-hidden="true" />
    if (type === 'error') return <XCircle size={16} className="text-rose-light shrink-0" aria-hidden="true" />
    return <Info size={16} className="text-cyan-light shrink-0" aria-hidden="true" />
  }

  const textFor = (type: Toast['type']) => {
    if (type === 'success') return 'text-emerald-light'
    if (type === 'error') return 'text-rose-light'
    return 'text-cyan-light'
  }

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xl pointer-events-auto glass-strong flex items-center gap-2 ${textFor(t.type)}`}
          >
            {iconFor(t.type)}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
