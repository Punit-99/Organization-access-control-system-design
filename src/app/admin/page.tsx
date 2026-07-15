'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { AdminHeader } from './components/AdminHeader';
import { OrgMetadataBanner } from './components/OrgMetadataBanner';
import { PermissionsMatrix } from './components/PermissionsMatrix';
import { AuditLogTable } from './components/AuditLogTable';
import { SecuritySandbox } from './components/SecuritySandbox';
import {
  UserProfile,
  OrgUser,
  AuditLog,
  EntitlementsResponse,
  ALL_SYSTEM_FEATURES,
} from './components/types';

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [allFeatures, setAllFeatures] = useState<string[]>([]);
  const [showAllFeatures, setShowAllFeatures] = useState<boolean>(false);
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
          const fetchedAllFeatures = entitlementsData.allFeatures || ALL_SYSTEM_FEATURES;
          setAllFeatures(fetchedAllFeatures);
          setCategory(entitlementsData.category);

          if (usersData.users.length > 0) {
            setTestTargetUserId(usersData.users[0].id);
          }
          if (fetchedAllFeatures.length > 0) {
            setTestFeature(fetchedAllFeatures[0]);
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
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.id !== userId) return user;
        const newPermissions =
          action === 'GRANT'
            ? [...user.permissions, { feature }]
            : user.permissions.filter((p) => p.feature !== feature);
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
        setSuccessMsg(
          `Successfully updated permission for ${originalUsers.find((u) => u.id === userId)?.email}`
        );
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
            <p className="text-sm text-muted-foreground">
              {errorMsg || 'You do not have permission to access the Admin Panel.'}
            </p>
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
      <AdminHeader onLogout={handleLogout} />

      {/* Main Container */}
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Org Metadata Banner */}
        <OrgMetadataBanner orgName={profile.orgName} category={category} />

        {/* Global Action Notifications */}
        {errorMsg && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/15 p-4 text-sm text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMsg}</span>
            </div>
            <button
              className="text-red-600 dark:text-red-400 hover:text-red-500 font-bold px-1"
              onClick={() => setErrorMsg(null)}
            >
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-950 bg-green-50 dark:bg-green-950/15 p-4 text-sm text-green-600 dark:text-green-400">
            <div className="flex items-center gap-2">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{successMsg}</span>
            </div>
            <button
              className="text-green-600 dark:text-green-400 hover:text-green-500 font-bold px-1"
              onClick={() => setSuccessMsg(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* User Permission Management Card */}
        <PermissionsMatrix
          category={category}
          entitlements={entitlements}
          allFeatures={allFeatures}
          showAllFeatures={showAllFeatures}
          setShowAllFeatures={setShowAllFeatures}
          users={users}
          submittingUser={submittingUser}
          handleTogglePermission={handleTogglePermission}
        />

        {/* Audit Log Table Card */}
        <AuditLogTable auditLogs={auditLogs} />

        {/* Security Sandbox card */}
        <SecuritySandbox
          users={users}
          entitlements={entitlements}
          allFeatures={allFeatures}
          testTargetUserId={testTargetUserId}
          setTestTargetUserId={setTestTargetUserId}
          testFeature={testFeature}
          setTestFeature={setTestFeature}
          testAction={testAction}
          setTestAction={setTestAction}
          testResult={testResult}
          testLoading={testLoading}
          handleSecurityTest={handleSecurityTest}
        />
      </main>
    </div>
  );
}
