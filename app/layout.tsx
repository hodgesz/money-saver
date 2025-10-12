import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Money Saver',
  description: 'Track your spending and save money',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
