import { PrismaClient, OrgCategory, Feature } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database data...');
  await prisma.permissionAuditLog.deleteMany({});
  await prisma.userPermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.categoryEntitlement.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('Seeding category entitlements...');
  const categoryEntitlementsData = [
    // BROKER
    { category: OrgCategory.BROKER, feature: Feature.VIEW_TRANSACTIONS },
    { category: OrgCategory.BROKER, feature: Feature.CREATE_TRANSACTION },
    { category: OrgCategory.BROKER, feature: Feature.MANAGE_USERS },
    // OPERATOR
    { category: OrgCategory.OPERATOR, feature: Feature.VIEW_TRANSACTIONS },
    { category: OrgCategory.OPERATOR, feature: Feature.CONFIGURE_ROUTING },
    { category: OrgCategory.OPERATOR, feature: Feature.MANAGE_USERS },
    // FBO
    { category: OrgCategory.FBO, feature: Feature.VIEW_TRANSACTIONS },
    { category: OrgCategory.FBO, feature: Feature.CONFIGURE_ROUTING },
  ];

  for (const ent of categoryEntitlementsData) {
    await prisma.categoryEntitlement.create({
      data: ent,
    });
  }

  console.log('Seeding organizations...');
  const brokerOrg = await prisma.organization.create({
    data: { name: 'Aero Brokerage', category: OrgCategory.BROKER },
  });
  const operatorOrg = await prisma.organization.create({
    data: { name: 'SkyOps Ground Handling', category: OrgCategory.OPERATOR },
  });
  const fboOrg = await prisma.organization.create({
    data: { name: 'Harbor FBO Services', category: OrgCategory.FBO },
  });

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);

  // 1. Aero Brokerage (BROKER)
  const adminBroker = await prisma.user.create({
    data: {
      email: 'admin@aerobroker.com',
      passwordHash,
      isAdmin: true,
      orgId: brokerOrg.id,
    },
  });
  const agentBroker = await prisma.user.create({
    data: {
      email: 'agent@aerobroker.com',
      passwordHash,
      isAdmin: false,
      orgId: brokerOrg.id,
    },
  });

  // 2. SkyOps Ground Handling (OPERATOR)
  const adminOperator = await prisma.user.create({
    data: {
      email: 'admin@skyops.com',
      passwordHash,
      isAdmin: true,
      orgId: operatorOrg.id,
    },
  });
  const dispatcherOperator = await prisma.user.create({
    data: {
      email: 'dispatcher@skyops.com',
      passwordHash,
      isAdmin: false,
      orgId: operatorOrg.id,
    },
  });

  // 3. Harbor FBO Services (FBO)
  const adminFbo = await prisma.user.create({
    data: {
      email: 'admin@harborfbo.com',
      passwordHash,
      isAdmin: true,
      orgId: fboOrg.id,
    },
  });
  const clerkFbo = await prisma.user.create({
    data: {
      email: 'clerk@harborfbo.com',
      passwordHash,
      isAdmin: false,
      orgId: fboOrg.id,
    },
  });

  console.log('Seeding user permissions...');
  const permissionGrants = [
    // Aero Brokerage users
    { userId: adminBroker.id, feature: Feature.VIEW_TRANSACTIONS },
    { userId: adminBroker.id, feature: Feature.CREATE_TRANSACTION },
    { userId: adminBroker.id, feature: Feature.MANAGE_USERS },
    { userId: agentBroker.id, feature: Feature.VIEW_TRANSACTIONS },

    // SkyOps Ground Handling users
    { userId: adminOperator.id, feature: Feature.VIEW_TRANSACTIONS },
    { userId: adminOperator.id, feature: Feature.CONFIGURE_ROUTING },
    { userId: adminOperator.id, feature: Feature.MANAGE_USERS },
    { userId: dispatcherOperator.id, feature: Feature.CONFIGURE_ROUTING },

    // Harbor FBO Services users
    { userId: adminFbo.id, feature: Feature.VIEW_TRANSACTIONS },
    { userId: adminFbo.id, feature: Feature.CONFIGURE_ROUTING },
    { userId: clerkFbo.id, feature: Feature.VIEW_TRANSACTIONS },
  ];

  for (const grant of permissionGrants) {
    await prisma.userPermission.create({
      data: {
        userId: grant.userId,
        feature: grant.feature,
      },
    });
  }

  console.log('Running sanity checks...');
  // Assert each grant matches org category entitlement
  const allGrants = await prisma.userPermission.findMany({
    include: {
      user: {
        include: {
          org: true,
        },
      },
    },
  });

  for (const grant of allGrants) {
    const entitlement = await prisma.categoryEntitlement.findUnique({
      where: {
        category_feature: {
          category: grant.user.org.category,
          feature: grant.feature,
        },
      },
    });

    if (!entitlement) {
      throw new Error(
        `Sanity check failed: User ${grant.user.email} in Org Category ${grant.user.org.category} granted unentitled feature ${grant.feature}!`
      );
    }
  }

  console.log('Sanity checks passed! Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
