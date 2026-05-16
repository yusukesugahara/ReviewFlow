"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SpaceManagementHeader } from "@/app/admin/spaces/_components/space-management-header";
import { SpaceList } from "@/app/admin/spaces/_components/space-list";
import {
  addMemberAction,
  createSpaceAction,
  inviteSpaceMemberAction,
  leaveSpaceAction,
  removeMemberAction,
  removeSpaceAction,
  updateMemberRoleAction,
} from "./actions";
import type { SpaceListItem, TenantUserSummary } from "./types";

type AdminSpacesViewProps = {
  canCreateSpace: boolean;
  currentUserId: string | null;
  error?: string;
  formError?: string;
  fetchErrorStatus?: number;
  isSystemAdmin: boolean;
  spaces: SpaceListItem[];
  users: TenantUserSummary[];
};

export function AdminSpacesView({
  canCreateSpace,
  currentUserId,
  error,
  formError,
  fetchErrorStatus,
  isSystemAdmin,
  spaces,
  users,
}: AdminSpacesViewProps) {
  if (fetchErrorStatus !== undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            スペース管理情報の取得に失敗しました（status: {fetchErrorStatus}）
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SpaceManagementHeader
        canCreateSpace={canCreateSpace}
        users={users}
        createSpaceAction={createSpaceAction}
      />

      {formError ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-700">{formError}</p>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {spaces.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            スペースが見つかりません
          </CardContent>
        </Card>
      ) : (
        <SpaceList
          spaces={spaces}
          currentUserId={currentUserId}
          isSystemAdmin={isSystemAdmin}
          addMemberAction={addMemberAction}
          inviteSpaceMemberAction={inviteSpaceMemberAction}
          updateMemberRoleAction={updateMemberRoleAction}
          removeMemberAction={removeMemberAction}
          leaveSpaceAction={leaveSpaceAction}
          removeSpaceAction={removeSpaceAction}
        />
      )}
    </div>
  );
}
