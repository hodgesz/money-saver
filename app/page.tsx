import { Button, Input, Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from '@/components/ui'

export default function Home() {
  return (
    <main className="min-h-screen bg-background-light dark:bg-background-dark p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-4">
            Money Saver - Design System
          </h1>
          <p className="text-lg text-black/60 dark:text-white/60">
            UI Component Library
          </p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary" disabled>Disabled Button</Button>
                <Button variant="primary" fullWidth>Full Width Button</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <Input placeholder="Basic Input" />
              <Input label="Email Address" type="email" placeholder="you@example.com" />
              <Input label="Password" type="password" placeholder="Enter your password" />
              <Input
                label="With Error"
                placeholder="Error state"
                error="This field is required"
              />
              <Input
                type="search"
                placeholder="Search transactions..."
                icon={
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
                  </svg>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary" size="sm">Small</Badge>
                <Badge variant="primary" size="md">Medium</Badge>
                <Badge variant="primary" size="lg">Large</Badge>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">Food</Badge>
                <Badge variant="success">Transportation</Badge>
                <Badge variant="warning">Entertainment</Badge>
                <Badge variant="danger">Utilities</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Bars Section */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Bars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ProgressBar value={75} variant="primary" showLabel label="Food Budget" />
              <ProgressBar value={50} variant="success" showLabel label="Transportation Budget" />
              <ProgressBar value={90} variant="warning" showLabel label="Entertainment Budget" />
              <ProgressBar value={100} variant="danger" showLabel label="Over Budget" />
              <ProgressBar value={33} variant="primary" size="sm" />
              <ProgressBar value={66} variant="primary" size="md" />
              <ProgressBar value={99} variant="primary" size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* Card Variants Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-black/60 dark:text-white/60">
                This is a default card with standard border styling.
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-black/60 dark:text-white/60">
                This is an elevated card with shadow for emphasis.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Example Usage */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Example: Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black/60 dark:text-white/60">Current Month Spending</p>
                  <p className="text-3xl font-bold text-black dark:text-white">$1,250</p>
                </div>
                <Badge variant="success" size="lg">On Track</Badge>
              </div>
              <div className="space-y-3">
                <ProgressBar value={75} variant="primary" showLabel label="Food" />
                <ProgressBar value={50} variant="primary" showLabel label="Transportation" />
                <ProgressBar value={90} variant="warning" showLabel label="Entertainment" />
              </div>
              <div className="flex gap-2">
                <Button variant="primary" fullWidth>View Details</Button>
                <Button variant="secondary" fullWidth>Add Transaction</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
