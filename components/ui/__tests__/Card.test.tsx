import { render, screen } from '@testing-library/react'
import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../Card'

describe('Card', () => {
  describe('Card component', () => {
    it('renders children correctly', () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<Card>Test</Card>)
      const card = screen.getByText('Test')
      expect(card.tagName).toBe('DIV')
    })

    it('applies default variant styles', () => {
      render(<Card>Default</Card>)
      const card = screen.getByText('Default')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('border-black/10')
    })

    it('applies elevated variant styles when specified', () => {
      render(<Card variant="elevated">Elevated</Card>)
      const card = screen.getByText('Elevated')
      expect(card).toHaveClass('shadow-lg')
      expect(card).toHaveClass('border-black/5')
    })

    it('applies medium padding by default', () => {
      render(<Card>Medium Padding</Card>)
      const card = screen.getByText('Medium Padding')
      expect(card).toHaveClass('p-6')
    })

    it('applies no padding when specified', () => {
      render(<Card padding="none">No Padding</Card>)
      const card = screen.getByText('No Padding')
      expect(card).not.toHaveClass('p-4')
      expect(card).not.toHaveClass('p-6')
      expect(card).not.toHaveClass('p-8')
    })

    it('applies small padding when specified', () => {
      render(<Card padding="sm">Small Padding</Card>)
      const card = screen.getByText('Small Padding')
      expect(card).toHaveClass('p-4')
    })

    it('applies large padding when specified', () => {
      render(<Card padding="lg">Large Padding</Card>)
      const card = screen.getByText('Large Padding')
      expect(card).toHaveClass('p-8')
    })

    it('applies base styles', () => {
      render(<Card>Base</Card>)
      const card = screen.getByText('Base')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('bg-white')
    })

    it('applies custom className', () => {
      render(<Card className="custom-class">Custom</Card>)
      const card = screen.getByText('Custom')
      expect(card).toHaveClass('custom-class')
    })

    it('forwards additional HTML attributes', () => {
      render(
        <Card data-testid="test-card" role="region">
          Test Card
        </Card>
      )
      const card = screen.getByTestId('test-card')
      expect(card).toHaveAttribute('role', 'region')
    })

    it('supports ref forwarding', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Ref Card</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardHeader component', () => {
    it('renders children correctly', () => {
      render(<CardHeader>Header Content</CardHeader>)
      expect(screen.getByText('Header Content')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<CardHeader>Header</CardHeader>)
      const header = screen.getByText('Header')
      expect(header.tagName).toBe('DIV')
    })

    it('applies default margin bottom', () => {
      render(<CardHeader>Header</CardHeader>)
      const header = screen.getByText('Header')
      expect(header).toHaveClass('mb-4')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>)
      const header = screen.getByText('Header')
      expect(header).toHaveClass('custom-header')
    })

    it('forwards additional HTML attributes', () => {
      render(
        <CardHeader data-testid="test-header">Header</CardHeader>
      )
      expect(screen.getByTestId('test-header')).toBeInTheDocument()
    })
  })

  describe('CardTitle component', () => {
    it('renders children correctly', () => {
      render(<CardTitle>Title Content</CardTitle>)
      expect(screen.getByText('Title Content')).toBeInTheDocument()
    })

    it('renders as an h3 element', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title.tagName).toBe('H3')
    })

    it('applies default styles', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('text-lg')
      expect(title).toHaveClass('font-medium')
      expect(title).toHaveClass('text-gray-900')
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
    })

    it('forwards additional HTML attributes', () => {
      render(
        <CardTitle data-testid="test-title">Title</CardTitle>
      )
      expect(screen.getByTestId('test-title')).toBeInTheDocument()
    })
  })

  describe('CardContent component', () => {
    it('renders children correctly', () => {
      render(<CardContent>Content Text</CardContent>)
      expect(screen.getByText('Content Text')).toBeInTheDocument()
    })

    it('renders as a div element', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content.tagName).toBe('DIV')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toHaveClass('custom-content')
    })

    it('forwards additional HTML attributes', () => {
      render(
        <CardContent data-testid="test-content">Content</CardContent>
      )
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('Card composition', () => {
    it('renders complete card structure', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>Card body content goes here</CardContent>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card body content goes here')).toBeInTheDocument()
    })

    it('works with elevated variant and custom padding', () => {
      render(
        <Card variant="elevated" padding="lg" data-testid="elevated-card">
          <CardHeader>
            <CardTitle>Elevated Card</CardTitle>
          </CardHeader>
          <CardContent>This is an elevated card with large padding</CardContent>
        </Card>
      )

      const cardElement = screen.getByTestId('elevated-card')
      expect(cardElement).toHaveClass('shadow-lg')
      expect(cardElement).toHaveClass('p-8')
    })
  })
})
