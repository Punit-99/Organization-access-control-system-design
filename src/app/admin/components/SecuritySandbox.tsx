'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OrgUser, ALL_SYSTEM_FEATURES } from './types';

interface SecuritySandboxProps {
  users: OrgUser[];
  entitlements: string[];
  allFeatures: string[];
  testTargetUserId: string;
  setTestTargetUserId: (val: string) => void;
  testFeature: string;
  setTestFeature: (val: string) => void;
  testAction: 'GRANT' | 'REVOKE';
  setTestAction: (val: 'GRANT' | 'REVOKE') => void;
  testResult: { status: number; body: any } | null;
  testLoading: boolean;
  handleSecurityTest: (e: React.FormEvent) => Promise<void> | void;
}

export function SecuritySandbox({
  users,
  entitlements,
  allFeatures,
  testTargetUserId,
  setTestTargetUserId,
  testFeature,
  setTestFeature,
  testAction,
  setTestAction,
  testResult,
  testLoading,
  handleSecurityTest,
}: SecuritySandboxProps) {
  const visibleFeatures = allFeatures.length > 0 ? allFeatures : ALL_SYSTEM_FEATURES;

  return (
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
            <Label htmlFor="testUser" className="text-muted-foreground">
              Target User
            </Label>
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
            <Label htmlFor="testFeature" className="text-muted-foreground">
              Feature (Includes non-entitled)
            </Label>
            <select
              id="testFeature"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={testFeature}
              onChange={(e) => setTestFeature(e.target.value)}
            >
              {visibleFeatures.map((f) => {
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
            <Label htmlFor="testAction" className="text-muted-foreground">
              Action
            </Label>
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

          <Button
            type="submit"
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={testLoading || !testTargetUserId}
          >
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
                <pre className="whitespace-pre-wrap text-[11px]">
                  {JSON.stringify(testResult.body, null, 2)}
                </pre>
              </div>
            ) : (
              <span className="text-muted-foreground">
                Submit the test inject form to see response. Try force-granting 'CREATE_TRANSACTION' to
                an FBO clerk to see the '403 FEATURE_NOT_ENTITLED' blocker.
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
