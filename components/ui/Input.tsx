import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-3 rounded-lg bg-background-light dark:bg-black/20 text-black dark:text-white placeholder-black/40 dark:placeholder-white/40 border border-black/10 dark:border-white/20 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'

    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''

    const combinedClassName = `${baseStyles} ${errorStyles} ${icon ? 'pl-10' : ''} ${className}`.trim()

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-black/40 dark:text-white/40">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={combinedClassName}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
