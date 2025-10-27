import { render, screen } from '@testing-library/react'
import React from 'react'
import { Badge } from '../Badge'

describe('Badge', () => {
  it('renders with correct text', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('renders as a span element', () => {
    render(<Badge>Badge</Badge>)
    const badge = screen.getByText('Badge')
    expect(badge.tagName).toBe('SPAN')
  })

  it('applies primary variant styles by default', () => {
    render(<Badge>Primary</Badge>)
    const badge = screen.getByText('Primary')
    expect(badge).toHaveClass('bg-primary/10')
    expect(badge).toHaveClass('text-primary')
  })

  it('applies secondary variant styles when specified', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge).toHaveClass('bg-gray-100')
  })

  it('applies success variant styles when specified', () => {
    render(<Badge variant="success">Success</Badge>)
    const badge = screen.getByText('Success')
    expect(badge).toHaveClass('bg-green-100')
    expect(badge).toHaveClass('text-green-700')
  })

  it('applies warning variant styles when specified', () => {
    render(<Badge variant="warning">Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge).toHaveClass('bg-yellow-100')
    expect(badge).toHaveClass('text-yellow-700')
  })

  it('applies danger variant styles when specified', () => {
    render(<Badge variant="danger">Danger</Badge>)
    const badge = screen.getByText('Danger')
    expect(badge).toHaveClass('bg-red-100')
    expect(badge).toHaveClass('text-red-700')
  })

  it('applies neutral variant styles when specified', () => {
    render(<Badge variant="neutral">Neutral</Badge>)
    const badge = screen.getByText('Neutral')
    expect(badge).toHaveClass('bg-black/5')
  })

  it('applies medium size styles by default', () => {
    render(<Badge>Medium</Badge>)
    const badge = screen.getByText('Medium')
    expect(badge).toHaveClass('px-2.5')
    expect(badge).toHaveClass('py-1')
  })

  it('applies small size styles when specified', () => {
    render(<Badge size="sm">Small</Badge>)
    const badge = screen.getByText('Small')
    expect(badge).toHaveClass('px-2')
    expect(badge).toHaveClass('py-0.5')
    expect(badge).toHaveClass('text-xs')
  })

  it('applies large size styles when specified', () => {
    render(<Badge size="lg">Large</Badge>)
    const badge = screen.getByText('Large')
    expect(badge).toHaveClass('px-3')
    expect(badge).toHaveClass('py-1.5')
    expect(badge).toHaveClass('text-sm')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-class')
  })

  it('applies base styles to all variants', () => {
    render(<Badge>Base</Badge>)
    const badge = screen.getByText('Base')
    expect(badge).toHaveClass('inline-flex')
    expect(badge).toHaveClass('items-center')
    expect(badge).toHaveClass('justify-center')
    expect(badge).toHaveClass('font-semibold')
    expect(badge).toHaveClass('rounded-full')
  })

  it('forwards additional HTML attributes', () => {
    render(
      <Badge data-testid="test-badge" title="Test Badge">
        Test
      </Badge>
    )
    const badge = screen.getByTestId('test-badge')
    expect(badge).toHaveAttribute('title', 'Test Badge')
  })

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLSpanElement>()
    render(<Badge ref={ref}>Ref Badge</Badge>)
    expect(ref.current).toBeInstanceOf(HTMLSpanElement)
  })

  it('renders children correctly', () => {
    render(
      <Badge>
        <span>Complex</span> Content
      </Badge>
    )
    expect(screen.getByText('Complex')).toBeInTheDocument()
    expect(screen.getByText(/Content/)).toBeInTheDocument()
  })
})
