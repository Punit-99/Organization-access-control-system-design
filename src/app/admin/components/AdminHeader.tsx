'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AdminHeaderProps {
  onLogout: () => Promise<void> | void;
}

export function AdminHeader({ onLogout }: AdminHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2 font-semibold">
        <span className="h-2.5 w-2.5 rounded-full bg-foreground"></span>
        Org Access Console
      </div>
      <nav className="flex items-center gap-4 text-sm font-medium">
        <span
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={() => router.push('/dashboard')}
        >
          Dashboard
        </span>
        <span className="text-foreground cursor-default">Admin Panel</span>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 border border-border text-foreground hover:bg-muted"
          onClick={onLogout}
        >
          Logout
        </Button>
      </nav>
    </header>
  );
}
