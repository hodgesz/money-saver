import React from 'react'

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  variant?: 'primary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value, variant = 'primary', size = 'md', showLabel = false, label, className = '', ...props }, ref) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(Math.max(value, 0), 100)

    const baseStyles = 'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden'

    const barVariantStyles = {
      primary: 'bg-primary',
      success: 'bg-green-500',
      warning: 'bg-yellow-500',
      danger: 'bg-red-500',
    }

    const sizeStyles = {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-3.5',
    }

    const combinedClassName = `${baseStyles} ${sizeStyles[size]} ${className}`.trim()

    return (
      <div ref={ref} className="w-full" {...props}>
        {(showLabel || label) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            )}
            {showLabel && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {clampedValue}%
              </span>
            )}
          </div>
        )}
        <div className={combinedClassName}>
          <div
            className={`h-full rounded-full transition-all duration-300 ease-in-out ${barVariantStyles[variant]}`}
            style={{ width: `${clampedValue}%` }}
            role="progressbar"
            aria-valuenow={clampedValue}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    )
  }
)

ProgressBar.displayName = 'ProgressBar'
