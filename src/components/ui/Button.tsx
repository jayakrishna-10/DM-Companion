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
  ariaLabel?: string
}

export function Button({ variant = 'secondary', size = 'md', className = '', children, onClick, disabled, type = 'button', ariaLabel }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 select-none'

  const variants = {
    primary: 'bg-cyan text-obsidian shadow-lg shadow-cyan-glow hover:brightness-110 active:brightness-90',
    secondary: 'bg-slate-3 border border-slate-4 text-body hover:border-cyan/30 hover:text-heading active:bg-slate-4',
    ghost: 'text-label hover:text-body hover:bg-slate-3/60 active:bg-slate-3',
    danger: 'bg-rose/10 text-rose-light border border-rose/20 hover:bg-rose/20 active:bg-rose/30',
  }

  const sizes = {
    sm: 'min-h-9 px-3 text-xs gap-1.5',
    md: 'min-h-11 px-4 text-sm gap-2',
    lg: 'min-h-12 px-6 text-base gap-2',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  )
}

interface IconButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  ariaLabel: string
}

export function IconButton({ children, onClick, disabled, className = '', ariaLabel }: IconButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-label hover:text-body hover:bg-slate-3/60 active:bg-slate-3 transition-colors disabled:opacity-40 ${className}`}
    >
      {children}
    </motion.button>
  )
}
