'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';

interface DashboardData {
  effectivePermissions: string[];
  orgEntitlements: string[];
  grants: string[];
  orgName: string;
  orgCategory: string;
}

interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  orgCategory: string;
}

const ALL_FEATURES = [
  { id: 'VIEW_TRANSACTIONS', label: 'View Transactions', desc: 'Allows viewing historical transaction logs.' },
  { id: 'CREATE_TRANSACTION', label: 'Create Transaction', desc: 'Allows creating new transactions for processing.' },
  { id: 'MANAGE_USERS', label: 'Manage Users', desc: 'Allows administrative actions on organization users.' },
  { id: 'CONFIGURE_ROUTING', label: 'Configure Routing', desc: 'Allows editing advanced cargo/routing parameters.' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWithRefresh = async (url: string, options: RequestInit = {}): Promise<Response> => {
      let res = await fetch(url, options);
      if (res.status === 401) {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshRes.ok) {
          res = await fetch(url, options);
        }
      }
      return res;
    };

    const fetchData = async () => {
      try {
        const meRes = await fetchWithRefresh('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        const dashRes = await fetchWithRefresh('/api/dashboard');
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setData(dashData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-2 animate-ping rounded-full bg-foreground"></div>
      </div>
    );
  }

  if (!user || !data) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground"></span>
          Org Access Console
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <span className="text-foreground cursor-default">Dashboard</span>
          {user.isAdmin && (
            <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push('/admin')}>
              Admin Panel
            </span>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="h-8 border border-border text-foreground hover:bg-muted" onClick={handleLogout}>
            Logout
          </Button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Welcome Banner */}
        <Card className="border-border bg-muted/20">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back, <span className="text-muted-foreground font-normal">{user.email}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Authorized Organization: <strong className="text-foreground font-semibold">{user.orgName}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {user.orgCategory} Category
              </div>
              {user.isAdmin && (
                <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Admin Role
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Summary Column */}
          <Card className="border-border bg-card flex flex-col justify-between">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-base font-semibold">Security Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4 flex-1">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Org Entitlements</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.orgEntitlements.map((ent) => (
                    <span key={ent} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground font-medium">
                      {ent}
                    </span>
                  ))}
                  {data.orgEntitlements.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Grants</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.grants.map((g) => (
                    <span key={g} className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground font-medium">
                      {g}
                    </span>
                  ))}
                  {data.grants.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Effective Permissions</div>
                <div className="flex flex-wrap gap-1.5">
                  {data.effectivePermissions.map((ep) => (
                    <span key={ep} className="rounded-md border border-green-200 dark:border-green-950 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                      {ep}
                    </span>
                  ))}
                  {data.effectivePermissions.length === 0 && (
                    <span className="rounded-md border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 text-xs text-red-600 dark:text-red-400 font-medium">
                      No Active Permissions
                    </span>
                  )}
                </div>
              </div>
            </CardContent>

            {user.isAdmin && (
              <div className="p-6 pt-0 border-t border-border mt-4">
                <Button className="w-full mt-4" onClick={() => router.push('/admin')}>
                  Go to Admin Panel
                </Button>
              </div>
            )}
          </Card>

          {/* Detailed Features Column */}
          <Card className="border-border bg-card md:col-span-2">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-base font-semibold">Feature Access Matrix</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Rule check visualization: `effective = grants ∩ entitlements`
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {ALL_FEATURES.map((feat) => {
                const isEntitled = data.orgEntitlements.includes(feat.id);
                const isGranted = data.grants.includes(feat.id);
                const isActive = data.effectivePermissions.includes(feat.id);

                let statusBadge = null;
                let cardStyle = "border-border bg-muted/20 opacity-50 border-dashed";

                if (isActive) {
                  statusBadge = <span className="rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/10 px-2 py-0.5 text-[10px] text-green-600 dark:text-green-400 font-semibold">Active</span>;
                  cardStyle = "border-green-200 dark:border-green-900 bg-green-50/20 dark:bg-green-950/5";
                } else if (isEntitled && !isGranted) {
                  statusBadge = <span className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/10 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 font-semibold">Not Granted</span>;
                  cardStyle = "border-border bg-card";
                } else {
                  statusBadge = <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">Locked (Unentitled)</span>;
                  cardStyle = "border-border bg-muted/10 opacity-40";
                }

                return (
                  <div key={feat.id} className={`flex flex-col gap-2 rounded-lg border p-4 transition-colors ${cardStyle}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{feat.label}</h3>
                      {statusBadge}
                    </div>
                    <p className="text-xs text-muted-foreground">{feat.desc}</p>
                    <div className="flex gap-4 pt-1 text-[10px]">
                      <span className={isEntitled ? "text-green-600 dark:text-green-400" : "text-red-500/70"}>
                        {isEntitled ? '✓ Entitled' : '✗ Unentitled'}
                      </span>
                      <span className="text-border">|</span>
                      <span className={isGranted ? "text-green-600 dark:text-green-400" : "text-red-500/70"}>
                        {isGranted ? '✓ Granted' : '✗ Not Granted'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
