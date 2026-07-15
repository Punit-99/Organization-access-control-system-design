import { prisma } from './prisma';
import { OrgCategory, Feature } from '@prisma/client';

export async function getEntitlementsForCategory(category: OrgCategory): Promise<Feature[]> {
  const entitlements = await prisma.categoryEntitlement.findMany({
    where: { category },
    select: { feature: true },
  });
  return entitlements.map((e) => e.feature);
}

export async function isFeatureEntitled(category: OrgCategory, feature: Feature): Promise<boolean> {
  const entitlement = await prisma.categoryEntitlement.findUnique({
    where: {
      category_feature: {
        category,
        feature,
      },
    },
  });
  return !!entitlement;
}
