export interface UserPermission {
  feature: string;
}

export interface OrgUser {
  id: string;
  email: string;
  isAdmin: boolean;
  permissions: UserPermission[];
}

export interface EntitlementsResponse {
  category: string;
  entitlements: string[];
  allFeatures: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  isAdmin: boolean;
  orgId: string;
  orgName: string;
  orgCategory: string;
}

export interface AuditLog {
  id: string;
  orgId: string;
  targetUserId: string;
  targetUserEmail: string;
  actorId: string;
  actorEmail: string;
  feature: string;
  action: string;
  createdAt: string;
}

export const ALL_SYSTEM_FEATURES = ['VIEW_TRANSACTIONS', 'CREATE_TRANSACTION', 'MANAGE_USERS', 'CONFIGURE_ROUTING'];

