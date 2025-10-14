'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'

export function Navigation() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/categories', label: 'Categories' },
    { href: '/budgets', label: 'Budgets' },
  ]

  const isActive = (href: string) => pathname === href

  async function handleSignOut() {
    await signOut()
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* App Name */}
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-gray-900">
              Money Saver
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Sign Out Button */}
          <Button onClick={handleSignOut} variant="ghost" size="sm">
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
