import React from 'react'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => {
    const baseStyles = 'w-full px-4 py-3 rounded-lg bg-background-light dark:bg-black/20 text-black dark:text-white border border-black/10 dark:border-white/20 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition'

    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''

    const combinedClassName = `${baseStyles} ${errorStyles} ${className}`.trim()

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-black dark:text-white mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={combinedClassName}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
