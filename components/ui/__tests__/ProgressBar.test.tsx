import { render, screen } from '@testing-library/react'
import React from 'react'
import { ProgressBar } from '../ProgressBar'

describe('ProgressBar', () => {
  it('renders a progress bar', () => {
    render(<ProgressBar value={50} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('displays correct value', () => {
    render(<ProgressBar value={75} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '75')
  })

  it('clamps value to maximum of 100', () => {
    render(<ProgressBar value={150} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps value to minimum of 0', () => {
    render(<ProgressBar value={-50} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  it('applies correct width based on value', () => {
    render(<ProgressBar value={60} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveStyle({ width: '60%' })
  })

  it('applies primary variant styles by default', () => {
    render(<ProgressBar value={50} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('bg-primary')
  })

  it('applies success variant styles when specified', () => {
    render(<ProgressBar value={50} variant="success" />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('bg-green-500')
  })

  it('applies warning variant styles when specified', () => {
    render(<ProgressBar value={50} variant="warning" />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('bg-yellow-500')
  })

  it('applies danger variant styles when specified', () => {
    render(<ProgressBar value={50} variant="danger" />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('bg-red-500')
  })

  it('applies medium size by default', () => {
    render(<ProgressBar value={50} />)
    const container = screen.getByRole('progressbar').parentElement
    expect(container).toHaveClass('h-2.5')
  })

  it('applies small size when specified', () => {
    render(<ProgressBar value={50} size="sm" />)
    const container = screen.getByRole('progressbar').parentElement
    expect(container).toHaveClass('h-1.5')
  })

  it('applies large size when specified', () => {
    render(<ProgressBar value={50} size="lg" />)
    const container = screen.getByRole('progressbar').parentElement
    expect(container).toHaveClass('h-3.5')
  })

  it('does not show percentage label by default', () => {
    render(<ProgressBar value={50} />)
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('shows percentage label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />)
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('displays custom label when provided', () => {
    render(<ProgressBar value={50} label="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays both custom label and percentage when both are provided', () => {
    render(<ProgressBar value={60} label="Progress" showLabel />)
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('has correct aria attributes', () => {
    render(<ProgressBar value={45} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '45')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('updates aria-valuenow when value changes', () => {
    const { rerender } = render(<ProgressBar value={25} />)
    let progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '25')

    rerender(<ProgressBar value={80} />)
    progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '80')
  })

  it('applies custom className', () => {
    render(<ProgressBar value={50} className="custom-progress" />)
    // The className is applied to the wrapper div, not the progressbar itself
    const wrapper = screen.getByRole('progressbar').closest('div')?.parentElement
    expect(wrapper).toHaveClass('custom-progress')
  })

  it('forwards additional HTML attributes', () => {
    render(
      <ProgressBar value={50} data-testid="test-progress" title="Test Progress" />
    )
    const wrapper = screen.getByTestId('test-progress')
    expect(wrapper).toHaveAttribute('title', 'Test Progress')
  })

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLDivElement>()
    render(<ProgressBar value={50} ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('handles zero value correctly', () => {
    render(<ProgressBar value={0} showLabel />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveStyle({ width: '0%' })
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('handles 100% value correctly', () => {
    render(<ProgressBar value={100} showLabel />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveStyle({ width: '100%' })
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('has transition styles for smooth animation', () => {
    render(<ProgressBar value={50} />)
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('transition-all')
    expect(progressBar).toHaveClass('duration-300')
    expect(progressBar).toHaveClass('ease-in-out')
  })

  it('renders with all props combined', () => {
    render(
      <ProgressBar
        value={85}
        variant="success"
        size="lg"
        showLabel
        label="Upload Progress"
      />
    )

    expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveClass('bg-green-500')
    expect(progressBar).toHaveStyle({ width: '85%' })

    const container = progressBar.parentElement
    expect(container).toHaveClass('h-3.5')
  })

  it('properly clamps decimal values', () => {
    render(<ProgressBar value={45.7} showLabel />)
    const progressBar = screen.getByRole('progressbar')
    // Value should be clamped but displayed as provided
    expect(progressBar).toHaveAttribute('aria-valuenow', '45.7')
    expect(screen.getByText('45.7%')).toBeInTheDocument()
  })

  it('applies background styles to container', () => {
    render(<ProgressBar value={50} />)
    const container = screen.getByRole('progressbar').parentElement
    expect(container).toHaveClass('bg-gray-200')
    expect(container).toHaveClass('rounded-full')
    expect(container).toHaveClass('overflow-hidden')
  })
})
