'use client';

import { Card, CardContent } from '@/components/ui/card';

interface OrgMetadataBannerProps {
  orgName: string;
  category: string;
}

export function OrgMetadataBanner({ orgName, category }: OrgMetadataBannerProps) {
  return (
    <Card className="border-border bg-muted/20">
      <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between p-6 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Organization Administration
          </h1>
          <p className="text-sm text-muted-foreground">
            Managing access boundaries for <strong className="text-foreground font-semibold">{orgName}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {category} Category
          </div>
          <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Admin Context
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
