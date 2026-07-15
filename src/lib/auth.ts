import { cookies } from 'next/headers';
import * as jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-key';

export interface JWTPayload {
  userId: string;
  orgId: string;
  isAdmin: boolean;
}

export function signToken(payload: JWTPayload): string {
  // Access token: short-lived 15 minutes
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function signRefreshToken(payload: JWTPayload): string {
  // Refresh token: long-lived 7 days
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req?: Request): Promise<JWTPayload> {
  let token: string | undefined;

  // 1. Try to get token from Authorization header if request is provided
  if (req) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 2. Try to get token from Next.js Cookie store
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get('auth-token')?.value;
    } catch {
      // In non-Next.js or testing contexts where cookies() throws
    }
  }

  // 3. Fall back to parsing the Request's Cookie header manually
  if (!token && req) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/auth-token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('UNAUTHORIZED');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return payload;
}

export async function requireAdmin(req?: Request): Promise<JWTPayload> {
  const payload = await requireAuth(req);
  if (!payload.isAdmin) {
    throw new Error('FORBIDDEN');
  }
  return payload;
}
