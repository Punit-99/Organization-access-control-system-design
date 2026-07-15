import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { isFeatureEntitled } from '../lib/entitlements';
import { signToken, signRefreshToken } from '../lib/auth';
import { POST } from '../app/api/admin/users/[userId]/permissions/route';
import { POST as refreshHandler } from '../app/api/auth/refresh/route';
import { OrgCategory, Feature } from '@prisma/client';

describe('Org Access Console Entitlement and Security Rules', () => {
  // Test accounts loaded from seeded DB
  let adminBroker: any;
  let agentBroker: any;
  
  let adminFbo: any;
  let clerkFbo: any;

  beforeAll(async () => {
    // Fetch users seeded in the database
    adminBroker = await prisma.user.findUnique({ where: { email: 'admin@aerobroker.com' } });
    agentBroker = await prisma.user.findUnique({ where: { email: 'agent@aerobroker.com' } });
    
    adminFbo = await prisma.user.findUnique({ where: { email: 'admin@harborfbo.com' } });
    clerkFbo = await prisma.user.findUnique({ where: { email: 'clerk@harborfbo.com' } });

    if (!adminBroker || !agentBroker || !adminFbo || !clerkFbo) {
      throw new Error('Test accounts not found. Make sure seed script was run.');
    }
  });

  // 1. Table-driven test over all 12 combinations
  describe('Rule 1: isFeatureEntitled Matrix Check', () => {
    const matrix = [
      // BROKER
      { category: OrgCategory.BROKER, feature: Feature.VIEW_TRANSACTIONS, expected: true },
      { category: OrgCategory.BROKER, feature: Feature.CREATE_TRANSACTION, expected: true },
      { category: OrgCategory.BROKER, feature: Feature.MANAGE_USERS, expected: true },
      { category: OrgCategory.BROKER, feature: Feature.CONFIGURE_ROUTING, expected: false },
      
      // OPERATOR
      { category: OrgCategory.OPERATOR, feature: Feature.VIEW_TRANSACTIONS, expected: true },
      { category: OrgCategory.OPERATOR, feature: Feature.CREATE_TRANSACTION, expected: false },
      { category: OrgCategory.OPERATOR, feature: Feature.MANAGE_USERS, expected: true },
      { category: OrgCategory.OPERATOR, feature: Feature.CONFIGURE_ROUTING, expected: true },

      // FBO
      { category: OrgCategory.FBO, feature: Feature.VIEW_TRANSACTIONS, expected: true },
      { category: OrgCategory.FBO, feature: Feature.CREATE_TRANSACTION, expected: false },
      { category: OrgCategory.FBO, feature: Feature.MANAGE_USERS, expected: false },
      { category: OrgCategory.FBO, feature: Feature.CONFIGURE_ROUTING, expected: true },
    ];

    matrix.forEach(({ category, feature, expected }) => {
      it(`should return ${expected} for ${category} accessing ${feature}`, async () => {
        const result = await isFeatureEntitled(category, feature);
        expect(result).toBe(expected);
      });
    });
  });

  // 2. Granting a feature outside the org's entitlement set returns 403 and writes nothing
  describe('Rule 2: Out of Entitlement Grants Blocked', () => {
    it('should reject FBO admin trying to grant CREATE_TRANSACTION to FBO clerk', async () => {
      // Confirm clerk doesn't have it granted
      const existing = await prisma.userPermission.findUnique({
        where: {
          userId_feature: {
            userId: clerkFbo.id,
            feature: Feature.CREATE_TRANSACTION,
          },
        },
      });
      expect(existing).toBeNull();

      // Sign token for FBO Admin
      const token = signToken({
        userId: adminFbo.id,
        orgId: adminFbo.orgId,
        isAdmin: true,
      });

      // Construct Mock Request
      const req = new Request(`http://localhost/api/admin/users/${clerkFbo.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.CREATE_TRANSACTION,
          action: 'GRANT',
        }),
      });

      // Call route handler directly
      const response = await POST(req, { params: { userId: clerkFbo.id } });
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('FEATURE_NOT_ENTITLED');

      // Assert database did not change
      const after = await prisma.userPermission.findUnique({
        where: {
          userId_feature: {
            userId: clerkFbo.id,
            feature: Feature.CREATE_TRANSACTION,
          },
        },
      });
      expect(after).toBeNull();
    });
  });

  // 3 & 4. Granting feature inside the entitlement set succeeds, is idempotent, and revoking is idempotent
  describe('Rule 3 & 4: Successful Grant, Revoke, and Idempotency', () => {
    it('should grant, repeat grant (idempotent), and revoke (idempotent) a feature successfully', async () => {
      // Feature: CREATE_TRANSACTION (entitled for BROKER)
      const token = signToken({
        userId: adminBroker.id,
        orgId: adminBroker.orgId,
        isAdmin: true,
      });

      // Step A: Grant permission
      const req1 = new Request(`http://localhost/api/admin/users/${agentBroker.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.CREATE_TRANSACTION,
          action: 'GRANT',
        }),
      });

      const res1 = await POST(req1, { params: { userId: agentBroker.id } });
      expect(res1.status).toBe(200);

      // Verify row is written
      let dbRow = await prisma.userPermission.findUnique({
        where: {
          userId_feature: {
            userId: agentBroker.id,
            feature: Feature.CREATE_TRANSACTION,
          },
        },
      });
      expect(dbRow).not.toBeNull();

      // Step B: Repeat grant (idempotence check)
      const req2 = new Request(`http://localhost/api/admin/users/${agentBroker.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.CREATE_TRANSACTION,
          action: 'GRANT',
        }),
      });

      const res2 = await POST(req2, { params: { userId: agentBroker.id } });
      expect(res2.status).toBe(200);

      // Check still exactly one row
      const count = await prisma.userPermission.count({
        where: {
          userId: agentBroker.id,
          feature: Feature.CREATE_TRANSACTION,
        },
      });
      expect(count).toBe(1);

      // Step C: Revoke permission
      const req3 = new Request(`http://localhost/api/admin/users/${agentBroker.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.CREATE_TRANSACTION,
          action: 'REVOKE',
        }),
      });

      const res3 = await POST(req3, { params: { userId: agentBroker.id } });
      expect(res3.status).toBe(200);

      // Verify row is deleted
      dbRow = await prisma.userPermission.findUnique({
        where: {
          userId_feature: {
            userId: agentBroker.id,
            feature: Feature.CREATE_TRANSACTION,
          },
        },
      });
      expect(dbRow).toBeNull();

      // Step D: Revoke non-existent grant (idempotence check)
      const req4 = new Request(`http://localhost/api/admin/users/${agentBroker.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.CREATE_TRANSACTION,
          action: 'REVOKE',
        }),
      });
      const res4 = await POST(req4, { params: { userId: agentBroker.id } });
      expect(res4.status).toBe(200); // Should not throw
    });
  });

  // 5. Cross-org guard checks
  describe('Rule 5: Cross-Organization Security Guard', () => {
    it('should reject a Broker admin trying to modify permissions of an FBO clerk', async () => {
      // Token for Broker Admin
      const token = signToken({
        userId: adminBroker.id,
        orgId: adminBroker.orgId,
        isAdmin: true,
      });

      // Try to grant a valid FBO feature (e.g. VIEW_TRANSACTIONS) to FBO clerk
      const req = new Request(`http://localhost/api/admin/users/${clerkFbo.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feature: Feature.VIEW_TRANSACTIONS,
          action: 'REVOKE',
        }),
      });

      const response = await POST(req, { params: { userId: clerkFbo.id } });
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body.error).toBe('CROSS_ORG_GUARD_TRIGGERED');
    });
  });

  // 6. Refresh Token flow checks
  describe('Rule 6: Refresh Token Flow', () => {
    it('should reject refresh if token cookie is missing', async () => {
      const req = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
      });
      const response = await refreshHandler(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('REFRESH_TOKEN_MISSING');
    });

    it('should reject refresh if token is invalid', async () => {
      const req = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Cookie': 'refresh-token=invalid-token',
        },
      });
      const response = await refreshHandler(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should refresh access token successfully if refresh token is valid', async () => {
      const refreshToken = signRefreshToken({
        userId: adminBroker.id,
        orgId: adminBroker.orgId,
        isAdmin: true,
      });

      const req = new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Cookie': `refresh-token=${refreshToken}`,
        },
      });
      const response = await refreshHandler(req);
      expect(response.status).toBe(200);

      const cookieHeader = response.headers.get('set-cookie');
      expect(cookieHeader).toContain('auth-token=');
    });
  });
});
