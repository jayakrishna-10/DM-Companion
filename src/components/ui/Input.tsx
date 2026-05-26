import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{label}</label>}
    <input
      ref={ref}
      className={`w-full h-10 px-3 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all ${className}`}
      {...props}
    />
  </div>
))

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{label}</label>}
    <textarea
      ref={ref}
      className={`w-full px-3 py-2.5 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 placeholder:text-neutral-500 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none min-h-[80px] ${className}`}
      rows={3}
      {...props}
    />
  </div>
))

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, options, placeholder, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{label}</label>}
    <select
      ref={ref}
      className={`w-full h-10 px-3 rounded-lg bg-neutral-900/60 border-neutral-800/50 text-neutral-200 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
))