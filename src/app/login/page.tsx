'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleQuickFill = (fillEmail: string) => {
    setEmail(fillEmail);
    setPassword('Passw0rd!');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      {/* Top right theme toggle */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border bg-card shadow-sm">
        <CardHeader className="text-center space-y-1.5 p-6 pb-4">
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            Org Access Console
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Granular access boundaries server-side validation
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 px-6 pb-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-2.5 text-xs text-red-600 dark:text-red-400">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error === 'INVALID_CREDENTIALS' ? 'Invalid email or password' : error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@aerobroker.com"
                className="border-input bg-background text-foreground text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="border-input bg-background text-foreground text-xs"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full text-xs"
              disabled={loading}
            >
              {loading ? (
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground"></div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 border-t border-border/80 p-6 pt-4">
          <div className="w-full space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Mock Sandbox Credentials (Passw0rd!)
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground w-16">Broker:</span>
                <div className="flex gap-2.5 flex-1">
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('admin@aerobroker.com')}>Admin</Button>
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('agent@aerobroker.com')}>User</Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground w-16">Operator:</span>
                <div className="flex gap-2.5 flex-1">
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('admin@skyops.com')}>Admin</Button>
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('dispatcher@skyops.com')}>User</Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground w-16">FBO:</span>
                <div className="flex gap-2.5 flex-1">
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('admin@harborfbo.com')}>Admin</Button>
                  <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] border-border text-foreground hover:bg-muted" onClick={() => handleQuickFill('clerk@harborfbo.com')}>User</Button>
                </div>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
