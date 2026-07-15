import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const adminPayload = await requireAdmin(req);

    // Fetch permission audit logs belonging to the admin's organization
    const logs = await prisma.permissionAuditLog.findMany({
      where: {
        orgId: adminPayload.orgId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // recent 50 changes
    });

    // Resolve emails of actors and target users
    const userIds = Array.from(
      new Set(logs.flatMap((l) => [l.targetUserId, l.actorId]))
    );

    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u.email]));

    const resolvedLogs = logs.map((log) => ({
      id: log.id,
      orgId: log.orgId,
      targetUserId: log.targetUserId,
      targetUserEmail: userMap.get(log.targetUserId) || 'Unknown User',
      actorId: log.actorId,
      actorEmail: userMap.get(log.actorId) || 'Unknown Admin',
      feature: log.feature,
      action: log.action,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ logs: resolvedLogs });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('Admin audit logs error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
