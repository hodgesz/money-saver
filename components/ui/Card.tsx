import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'rounded-lg bg-white dark:bg-gray-800'

    const variantStyles = {
      default: 'border border-black/10 dark:border-white/10',
      elevated: 'shadow-lg border border-black/5 dark:border-white/5',
    }

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    }

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`.trim()

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardHeader = ({ className = '', children, ...props }: CardHeaderProps) => {
  return (
    <div className={`mb-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}

CardHeader.displayName = 'CardHeader'

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

export const CardTitle = ({ className = '', children, ...props }: CardTitleProps) => {
  return (
    <h3 className={`text-lg font-medium text-gray-900 dark:text-white ${className}`.trim()} {...props}>
      {children}
    </h3>
  )
}

CardTitle.displayName = 'CardTitle'

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const CardContent = ({ className = '', children, ...props }: CardContentProps) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

CardContent.displayName = 'CardContent'
