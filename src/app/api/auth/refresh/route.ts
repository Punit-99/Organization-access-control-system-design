import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyRefreshToken, signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    let refreshToken: string | undefined;

    // 1. Try Next.js cookie store
    try {
      const cookieStore = cookies();
      refreshToken = cookieStore.get('refresh-token')?.value;
    } catch {
      // Ignore in testing environments
    }

    // 2. Fall back to manual request headers parser
    if (!refreshToken && req) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/refresh-token=([^;]+)/);
        if (match) {
          refreshToken = match[1];
        }
      }
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'REFRESH_TOKEN_MISSING' }, { status: 401 });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json({ error: 'INVALID_REFRESH_TOKEN' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { org: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 401 });
    }

    // Sign new access token
    const newPayload = {
      userId: user.id,
      orgId: user.orgId,
      isAdmin: user.isAdmin,
    };
    
    const newAccessToken = signToken(newPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
        orgId: user.orgId,
        orgName: user.org.name,
        orgCategory: user.org.category,
      },
    });

    response.cookies.set({
      name: 'auth-token',
      value: newAccessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return response;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
