'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { OrgUser, ALL_SYSTEM_FEATURES } from './types';

interface PermissionsMatrixProps {
  category: string;
  entitlements: string[];
  allFeatures: string[];
  showAllFeatures: boolean;
  setShowAllFeatures: (val: boolean) => void;
  users: OrgUser[];
  submittingUser: string | null;
  handleTogglePermission: (userId: string, feature: string, currentGranted: boolean) => Promise<void> | void;
}

export function PermissionsMatrix({
  category,
  entitlements,
  allFeatures,
  showAllFeatures,
  setShowAllFeatures,
  users,
  submittingUser,
  handleTogglePermission,
}: PermissionsMatrixProps) {
  const visibleFeatures = showAllFeatures
    ? allFeatures.length > 0
      ? allFeatures
      : ALL_SYSTEM_FEATURES
    : entitlements;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="text-base font-semibold">User Permissions Matrix</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Only offering entitled features for the <strong className="text-foreground font-semibold">{category}</strong> category: {entitlements.join(', ')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {/* Permission Visibility Radio Controls */}
        <div className="flex items-center gap-6 mb-4 px-1">
          <span className="text-xs font-semibold text-muted-foreground">Permission Visibility:</span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
              <input
                type="radio"
                name="permission-visibility"
                checked={!showAllFeatures}
                onChange={() => setShowAllFeatures(false)}
                className="w-4 h-4 text-primary focus:ring-primary border-border bg-background accent-primary cursor-pointer"
              />
              <span>Show Entitled Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
              <input
                type="radio"
                name="permission-visibility"
                checked={showAllFeatures}
                onChange={() => setShowAllFeatures(true)}
                className="w-4 h-4 text-primary focus:ring-primary border-border bg-background accent-primary cursor-pointer"
              />
              <span>Show All Features (Including Hidden)</span>
            </label>
          </div>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">User Email</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                {visibleFeatures.map((ent) => (
                  <TableHead key={ent} className="text-center text-muted-foreground whitespace-nowrap">
                    {ent.replace(/_/g, ' ')}
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
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-2xs font-semibold border ${
                        user.isAdmin
                          ? 'bg-muted text-muted-foreground border-border'
                          : 'bg-transparent text-muted-foreground border-border'
                      }`}
                    >
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </TableCell>
                  {visibleFeatures.map((ent) => {
                    const isGranted = user.permissions.some((p) => p.feature === ent);
                    const isWorking = submittingUser === user.id;
                    const isEntitled = entitlements.includes(ent);

                    return (
                      <TableCell key={ent} className="text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* On Radio (Green) - Only render if feature is entitled */}
                          {isEntitled && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="radio"
                                name={`perm-${user.id}-${ent}`}
                                checked={isGranted}
                                disabled={isWorking}
                                onChange={() => {
                                  if (!isGranted) {
                                    handleTogglePermission(user.id, ent, false);
                                  }
                                }}
                                className={`w-4 h-4 border-border bg-background cursor-pointer disabled:cursor-not-allowed ${
                                  isGranted
                                    ? 'text-emerald-500 focus:ring-emerald-400 accent-emerald-500 font-bold'
                                    : 'text-muted-foreground focus:ring-muted border-muted-foreground/30 accent-muted-foreground'
                                }`}
                              />
                              <span
                                className={`text-xs transition-colors ${
                                  isGranted
                                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                On
                              </span>
                            </label>
                          )}

                          {/* Off Radio (Red) */}
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`perm-${user.id}-${ent}`}
                              checked={!isGranted}
                              disabled={isWorking || !isEntitled}
                              onChange={() => {
                                if (isGranted) {
                                  handleTogglePermission(user.id, ent, true);
                                }
                              }}
                              className={`w-4 h-4 border-border bg-background cursor-pointer disabled:cursor-not-allowed ${
                                !isGranted
                                  ? 'text-rose-500 focus:ring-rose-400 accent-rose-500 font-bold'
                                  : 'text-muted-foreground focus:ring-muted border-muted-foreground/30 accent-muted-foreground'
                              }`}
                            />
                            <span
                              className={`text-xs transition-colors ${
                                !isGranted
                                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              Off
                            </span>
                          </label>

                          {/* Unentitled indicator badge */}
                          {!isEntitled && (
                            <span
                              className="ml-1 inline-flex items-center rounded bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 text-[9px] font-medium text-amber-800 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-500/20"
                              title="This feature is not entitled for this organization category."
                            >
                              Unentitled
                            </span>
                          )}
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
  );
}
