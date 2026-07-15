import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEntitlementsForCategory } from '@/lib/entitlements';
import { Feature } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const adminPayload = await requireAdmin(req);

    // Get admin organization details
    const org = await prisma.organization.findUnique({
      where: { id: adminPayload.orgId },
    });

    if (!org) {
      return NextResponse.json({ error: 'ORGANIZATION_NOT_FOUND' }, { status: 404 });
    }

    // Get entitled features for organization category
    const entitlements = await getEntitlementsForCategory(org.category);

    return NextResponse.json({
      category: org.category,
      entitlements,
      allFeatures: Object.values(Feature),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('Admin entitlements error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
