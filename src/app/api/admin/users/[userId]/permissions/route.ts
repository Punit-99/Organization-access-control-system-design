import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFeatureEntitled } from '@/lib/entitlements';
import { permissionSchema } from '@/lib/validation';

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const adminPayload = await requireAdmin(req);
    const targetUserId = params.userId;

    // 1. Load target user and their organization
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { org: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Assert cross-organization boundary
    if (targetUser.orgId !== adminPayload.orgId) {
      return NextResponse.json(
        { error: 'CROSS_ORG_GUARD_TRIGGERED', message: 'You are not authorized to modify users in other organizations' },
        { status: 403 }
      );
    }

    // 3. Parse input through Zod schema
    const body = await req.json();
    const result = permissionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', details: result.error.format() },
        { status: 400 }
      );
    }

    const { feature, action } = result.data;

    // 4. The Core Rule Check: Check category entitlements
    const entitled = await isFeatureEntitled(targetUser.org.category, feature);
    if (!entitled) {
      return NextResponse.json(
        {
          error: 'FEATURE_NOT_ENTITLED',
          message: `The organization category '${targetUser.org.category}' is not entitled to use the feature '${feature}'`,
          feature,
          category: targetUser.org.category,
        },
        { status: 403 }
      );
    }

    // 5. Execute action idempotently
    if (action === 'GRANT') {
      await prisma.userPermission.upsert({
        where: {
          userId_feature: {
            userId: targetUserId,
            feature,
          },
        },
        update: {}, // nothing to update if it exists
        create: {
          userId: targetUserId,
          feature,
          grantedBy: adminPayload.userId,
        },
      });
    } else if (action === 'REVOKE') {
      // Use deleteMany to make it idempotent (no throw if it doesn't exist)
      await prisma.userPermission.deleteMany({
        where: {
          userId: targetUserId,
          feature,
        },
      });
    }

    // 6. Write to PermissionAuditLog
    await prisma.permissionAuditLog.create({
      data: {
        orgId: targetUser.orgId,
        targetUserId,
        actorId: adminPayload.userId,
        feature,
        action,
      },
    });

    // 7. Get and return updated user permissions
    const updatedPermissions = await prisma.userPermission.findMany({
      where: { userId: targetUserId },
      select: { feature: true },
    });

    return NextResponse.json({
      userId: targetUserId,
      permissions: updatedPermissions.map((p) => p.feature),
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    console.error('Update permission error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
