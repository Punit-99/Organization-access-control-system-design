'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';

interface UserPermission {
  feature: string;
}

interface OrgUser {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions: UserPermission[];
}

interface EntitlementsResponse {
  category: string;
  entitlements: string[];
}

interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  orgCategory: string;
}

interface AuditLog {
  id: string;
  orgId: string;
  targetUserId: string;
  targetUserEmail: string;
  actorId: string;
  actorEmail: string;
  feature: string;
  action: string;
  createdAt: string;
}

const ALL_SYSTEM_FEATURES = ['VIEW_TRANSACTIONS', 'CREATE_TRANSACTION', 'MANAGE_USERS', 'CONFIGURE_ROUTING'];

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submittingUser, setSubmittingUser] = useState<string | null>(null);
  
  // Status notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Security Test State
  const [testTargetUserId, setTestTargetUserId] = useState('');
  const [testFeature, setTestFeature] = useState(ALL_SYSTEM_FEATURES[0]);
  const [testAction, setTestAction] = useState<'GRANT' | 'REVOKE'>('GRANT');
  const [testResult, setTestResult] = useState<{ status: number; body: any } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Fetch helper with access token refresh mechanism
  const fetchWithRefresh = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    let res = await fetch(url, options);
    if (res.status === 401) {
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
      if (refreshRes.ok) {
        res = await fetch(url, options);
      }
    }
    return res;
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetchWithRefresh('/api/admin/audit-log');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [fetchWithRefresh]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const meRes = await fetchWithRefresh('/api/auth/me');
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }
        const meData = await meRes.json();
        if (!meData.user.isAdmin) {
          setErrorMsg('FORBIDDEN: You must be an administrator to view this page.');
          setLoading(false);
          return;
        }
        setProfile(meData.user);

        // Fetch users in own org, entitlements, and audit logs
        const usersRes = await fetchWithRefresh('/api/admin/users');
        const entitlementsRes = await fetchWithRefresh('/api/admin/entitlements');

        if (usersRes.ok && entitlementsRes.ok) {
          const usersData = await usersRes.json();
          const entitlementsData: EntitlementsResponse = await entitlementsRes.json();
          
          setUsers(usersData.users);
          setEntitlements(entitlementsData.entitlements);
          setCategory(entitlementsData.category);

          if (usersData.users.length > 0) {
            setTestTargetUserId(usersData.users[0].id);
          }

          // Fetch the audit logs
          await fetchAuditLogs();
        }
      } catch (err) {
        console.error('Error loading admin panel:', err);
        setErrorMsg('Failed to load administrator data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router, fetchWithRefresh, fetchAuditLogs]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleTogglePermission = async (userId: string, feature: string, currentGranted: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmittingUser(userId);

    const action = currentGranted ? 'REVOKE' : 'GRANT';

    // Optimistic Update
    const originalUsers = [...users];
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.id !== userId) return user;
        const newPermissions = action === 'GRANT' 
          ? [...user.permissions, { feature }] 
          : user.permissions.filter(p => p.feature !== feature);
        return { ...user, permissions: newPermissions };
      })
    );

    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUsers(originalUsers);
        setErrorMsg(data.message || `Failed to update permission: ${data.error}`);
      } else {
        setSuccessMsg(`Successfully updated permission for ${originalUsers.find(u => u.id === userId)?.email}`);
        // Fetch fresh audit logs to display the change
        await fetchAuditLogs();
      }
    } catch (err) {
      setUsers(originalUsers);
      setErrorMsg('Network error updating permission.');
    } finally {
      setSubmittingUser(null);
    }
  };

  // Run security bypass test
  const handleSecurityTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setTestResult(null);
    setTestLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${testTargetUserId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: testFeature, action: testAction }),
      });

      const body = await res.json();
      setTestResult({ status: res.status, body });

      if (res.ok) {
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.users);
        }
        // Fetch fresh audit logs to display the injection try
        await fetchAuditLogs();
      }
    } catch (err) {
      setTestResult({ status: 0, body: 'Network connection failure.' });
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-2 w-2 animate-ping rounded-full bg-foreground"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border bg-card text-center shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="mx-auto rounded-full border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 px-3 py-1 text-xs text-red-600 dark:text-red-400 font-semibold w-fit">
              Access Denied
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Unauthorized</h1>
            <p className="text-sm text-muted-foreground">{errorMsg || 'You do not have permission to access the Admin Panel.'}</p>
            <Button className="w-full" onClick={() => router.replace('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground"></span>
          Org Access Console
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <span className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>
            Dashboard
          </span>
          <span className="text-foreground cursor-default">Admin Panel</span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="h-8 border border-border text-foreground hover:bg-muted" onClick={handleLogout}>
            Logout
          </Button>
        </nav>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Org Metadata Banner */}
        <Card className="border-border bg-muted/20">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Organization Administration
              </h1>
              <p className="text-sm text-muted-foreground">
                Managing access boundaries for <strong className="text-foreground font-semibold">{profile.orgName}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category} Category
              </div>
              <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin Context
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Action Notifications */}
        {errorMsg && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/15 p-4 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button className="text-red-600 dark:text-red-400 hover:text-red-500 font-bold px-1" onClick={() => setErrorMsg(null)}>×</button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-950 bg-green-50 dark:bg-green-950/15 p-4 text-sm text-green-600 dark:text-green-400">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
            <button className="text-green-600 dark:text-green-400 hover:text-green-500 font-bold px-1" onClick={() => setSuccessMsg(null)}>×</button>
          </div>
        )}

        {/* User Permission Management Card */}
        <Card className="border-border bg-card">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-semibold">User Permissions Matrix</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Only offering entitled features for the <strong className="text-foreground font-semibold">{category}</strong> category: {entitlements.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">User Email</TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    {entitlements.map((ent) => (
                      <TableHead key={ent} className="text-center text-muted-foreground">
                        {ent.replace('_', ' ')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell>
                        <div className="font-medium text-foreground">{user.email}</div>
                        <div className="text-[10px] text-muted-foreground">ID: {user.id}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-2xs font-semibold border ${user.isAdmin ? 'bg-muted text-muted-foreground border-border' : 'bg-transparent text-muted-foreground border-border'}`}>
                          {user.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </TableCell>
                      {entitlements.map((ent) => {
                        const isGranted = user.permissions.some((p) => p.feature === ent);
                        const isWorking = submittingUser === user.id;

                        return (
                          <TableCell key={ent} className="text-center">
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={isGranted}
                                disabled={isWorking}
                                onCheckedChange={() => handleTogglePermission(user.id, ent, isGranted)}
                                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                              />
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table Card */}
        <Card className="border-border bg-card">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-base font-semibold">Recent Changes (Audit Log)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Permission audit trail tracking for organization user accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground">Admin Actor</TableHead>
                    <TableHead className="text-muted-foreground">Target User</TableHead>
                    <TableHead className="text-muted-foreground">Feature Name</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-border">
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {log.actorEmail}
                      </TableCell>
                      <TableCell className="text-xs text-foreground">
                        {log.targetUserEmail}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {log.feature}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          log.action === 'GRANT' 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30' 
                            : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30'
                        }`}>
                          {log.action}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                        No recent permission modifications detected.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Security Sandbox card */}
        <Card className="border-red-200 dark:border-red-950 bg-red-50/10 dark:bg-red-950/5">
          <CardHeader className="p-6 pb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 text-[10px] text-red-600 dark:text-red-400 font-semibold">
                Security Sandbox
              </span>
              <CardTitle className="text-base font-semibold">Bypass Test Console</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Trigger a direct API call bypassing UI constraints to test the server-side entitlement check logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form */}
            <form onSubmit={handleSecurityTest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="testUser" className="text-muted-foreground">Target User</Label>
                <select
                  id="testUser"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={testTargetUserId}
                  onChange={(e) => setTestTargetUserId(e.target.value)}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.isAdmin ? 'Admin' : 'User'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="testFeature" className="text-muted-foreground">Feature (Includes non-entitled)</Label>
                <select
                  id="testFeature"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={testFeature}
                  onChange={(e) => setTestFeature(e.target.value)}
                >
                  {ALL_SYSTEM_FEATURES.map((f) => {
                    const isEnt = entitlements.includes(f);
                    return (
                      <option key={f} value={f}>
                        {f} {isEnt ? '(Entitled)' : '(UNENTITLED - Exploitable)'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="testAction" className="text-muted-foreground">Action</Label>
                <select
                  id="testAction"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={testAction}
                  onChange={(e) => setTestAction(e.target.value as 'GRANT' | 'REVOKE')}
                >
                  <option value="GRANT">GRANT</option>
                  <option value="REVOKE">REVOKE</option>
                </select>
              </div>

              <Button type="submit" className="bg-red-600 text-white hover:bg-red-700" disabled={testLoading || !testTargetUserId}>
                {testLoading ? 'Injecting...' : 'Inject POST Request'}
              </Button>
            </form>

            {/* Results Console */}
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground">API Response Output</Label>
              <div className="flex-1 rounded-md border border-border bg-muted/30 p-4 font-mono text-xs overflow-y-auto min-h-[180px] max-h-[300px] text-foreground">
                {testResult ? (
                  <div className="space-y-2">
                    <div className="font-semibold">
                      HTTP Status:{' '}
                      <span className={testResult.status === 200 ? 'text-green-500' : 'text-red-500'}>
                        {testResult.status}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(testResult.body, null, 2)}</pre>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    Submit the test inject form to see response. Try force-granting 'CREATE_TRANSACTION' to an FBO clerk to see the '403 FEATURE_NOT_ENTITLED' blocker.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
