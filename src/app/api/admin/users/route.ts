import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const adminPayload = await requireAdmin(req);

    // Fetch users belonging to the admin's own organization
    const users = await prisma.user.findMany({
      where: {
        orgId: adminPayload.orgId,
      },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        permissions: {
          select: {
            feature: true,
          },
        },
      },
      orderBy: {
        email: 'asc',
      },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('Admin list users error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
