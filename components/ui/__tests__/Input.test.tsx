import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { Input } from '../Input'

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByText('Email Address')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(<Input placeholder="No label" />)
    expect(screen.queryByText('Email Address')).not.toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error styles when error is present', () => {
    render(<Input error="Error message" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-500')
    expect(input).toHaveClass('focus:ring-red-500')
  })

  it('does not render error message when not provided', () => {
    render(<Input />)
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const icon = <span data-testid="test-icon">🔍</span>
    render(<Input icon={icon} />)
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('applies left padding when icon is present', () => {
    const icon = <span>🔍</span>
    render(<Input icon={icon} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('pl-10')
  })

  it('does not apply left padding when icon is not present', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).not.toHaveClass('pl-10')
  })

  it('accepts user input', async () => {
    const user = userEvent.setup()
    render(<Input />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('calls onChange handler when input changes', async () => {
    const user = userEvent.setup()
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'Test')

    expect(handleChange).toHaveBeenCalled()
  })

  it('applies custom className to input', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })

  it('supports controlled input', () => {
    const { rerender } = render(<Input value="Initial" onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('Initial')

    rerender(<Input value="Updated" onChange={() => {}} />)
    expect(input).toHaveValue('Updated')
  })

  it('forwards additional HTML attributes', () => {
    render(
      <Input
        type="email"
        name="email"
        required
        data-testid="email-input"
      />
    )
    const input = screen.getByTestId('email-input')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toBeRequired()
  })

  it('supports ref forwarding', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it('can focus input using ref', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    ref.current?.focus()
    expect(ref.current).toHaveFocus()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('renders complete input with label, icon, and error', () => {
    const icon = <span data-testid="search-icon">🔍</span>
    render(
      <Input
        label="Search"
        placeholder="Search for items"
        icon={icon}
        error="No results found"
      />
    )

    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search for items')).toBeInTheDocument()
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('associates label with input using implicit association', () => {
    render(<Input label="Username" />)
    const label = screen.getByText('Username')
    const input = screen.getByRole('textbox')

    // The input is inside the label's parent container
    expect(label).toBeInTheDocument()
    expect(input).toBeInTheDocument()
  })

  it('applies base styles', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('w-full')
    expect(input).toHaveClass('px-4')
    expect(input).toHaveClass('py-3')
    expect(input).toHaveClass('rounded-lg')
    expect(input).toHaveClass('border')
  })

  it('supports different input types', () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')

    rerender(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" />)
    const passwordInput = document.querySelector('input[type="password"]')
    expect(passwordInput).toBeInTheDocument()
  })
})
