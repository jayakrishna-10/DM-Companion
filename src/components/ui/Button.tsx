import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, onClick, disabled, type = 'button' }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none'
  
  const variants = {
    primary: 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20',
    secondary: 'bg-neutral-800/80 text-neutral-200 border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600',
    ghost: 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60',
    danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </motion.button>
  )
}