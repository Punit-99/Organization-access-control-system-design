import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEntitlementsForCategory } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const payload = await requireAuth(req);

    // Get user details, organization category, and raw grants
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        org: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Retrieve entitlements for user's organization category
    const orgEntitlements = await getEntitlementsForCategory(user.org.category);

    // Raw user grants
    const grants = user.permissions.map((p) => p.feature);

    // Effective permissions = grants ∩ entitlements
    const effectivePermissions = grants.filter((g) => orgEntitlements.includes(g));

    return NextResponse.json({
      effectivePermissions,
      orgEntitlements,
      grants,
      orgName: user.org.name,
      orgCategory: user.org.category,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('Dashboard api error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
