'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AuditLog } from './types';

interface AuditLogTableProps {
  auditLogs: AuditLog[];
}

export function AuditLogTable({ auditLogs }: AuditLogTableProps) {
  return (
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
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        log.action === 'GRANT'
                          ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30'
                          : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30'
                      }`}
                    >
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
  );
}
