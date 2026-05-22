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
    primary: 'gradient-cta text-white shadow-lg shadow-accent/20 hover:shadow-accent/40',
    secondary: 'bg-surface-2 text-text-primary border border-border-subtle hover:bg-border-subtle',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-2',
    danger: 'bg-complaint/10 text-complaint-light border border-complaint/20 hover:bg-complaint/20',
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