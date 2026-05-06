import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TENANT_ROLES } from "@/lib/constants/roles";

type SpaceEmptyStateProps = {
  userRoles: string[];
};

export function SpaceEmptyState({ userRoles }: SpaceEmptyStateProps) {
  if (userRoles.includes(TENANT_ROLES.admin)) {
    return (
      <BaseSpaceEmptyState
        title="スペースがありません"
        description="スペース管理画面でスペースを作成してください"
        action={
          <Button asChild>
            <Link href="/admin/spaces">スペース管理へ</Link>
          </Button>
        }
      />
    );
  }

  return (
    <BaseSpaceEmptyState
      title="ワークスペースに招待されていません"
      description="管理者の操作をお待ちください"
    />
  );
}

function BaseSpaceEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
