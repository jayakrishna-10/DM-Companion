import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-label uppercase tracking-wider">{label}</label>}
    <input
      ref={ref}
      className={`w-full min-h-11 px-3 rounded-xl bg-slate-1 border border-slate-4 text-body placeholder:text-label/50 text-sm focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_0_3px_var(--color-cyan-glow)] transition-all ${className}`}
      {...props}
    />
  </div>
))

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ label, className = '', ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-medium text-label uppercase tracking-wider">{label}</label>}
    <textarea
      ref={ref}
      className={`w-full px-3 py-2.5 rounded-xl bg-slate-1 border border-slate-4 text-body placeholder:text-label/50 text-sm focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_0_3px_var(--color-cyan-glow)] transition-all resize-none min-h-[80px] ${className}`}
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
    {label && <label className="text-xs font-medium text-label uppercase tracking-wider">{label}</label>}
    <select
      ref={ref}
      className={`w-full min-h-11 px-3 rounded-xl bg-slate-1 border border-slate-4 text-body text-sm focus:outline-none focus:border-cyan/50 focus:shadow-[0_0_0_3px_var(--color-cyan-glow)] transition-all appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
))
