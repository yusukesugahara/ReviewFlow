"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CardHeading } from "@/components/ui/card-heading";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  removeSpaceMemberAction,
  updateSpaceMemberRoleAction,
} from "./actions";
import { SpaceUserAddDialog } from "./_components/space-user-add-dialog";
import { SpaceUsersTable } from "./_components/space-users-table";
import { buildSpaceUserTableMembers } from "./_view-models/space-users-view-model";
import type { SpaceUsersErrorViewProps, SpaceUsersViewProps } from "./types";

/**
 * スペースユーザー管理画面を表示します。
 */
export function SpaceUsersView({
  availableUsers,
  currentUserId,
  error,
  formError,
  isTenantAdmin,
  members,
  spaceId,
}: SpaceUsersViewProps) {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  return (
    <div className="space-y-6">
      {error ? <SpaceUsersMessage message={error} /> : null}
      {formError ? <SpaceUsersMessage message={formError} /> : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardHeading
              description="スペースに参加しているユーザを管理します"
              title="スペースユーザ一覧"
            />
            {isTenantAdmin ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="ユーザをスペースに追加"
                      onClick={() => setIsAddMemberOpen(true)}
                    >
                      <UserRoundPlus aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>ユーザをスペースに追加</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              ユーザが見つかりません
            </p>
          ) : (
            <SpaceUsersTable
              currentUserId={currentUserId}
              members={buildSpaceUserTableMembers(members)}
              removeMemberAction={removeSpaceMemberAction}
              spaceId={spaceId}
              updateMemberRoleAction={updateSpaceMemberRoleAction}
            />
          )}
        </CardContent>
      </Card>

      {isAddMemberOpen ? (
        <SpaceUserAddDialog
          availableUsers={availableUsers}
          onClose={() => setIsAddMemberOpen(false)}
          spaceId={spaceId}
        />
      ) : null}
    </div>
  );
}

/**
 * スペースユーザー管理画面のエラー状態を表示します。
 */
export function SpaceUsersErrorView({ status }: SpaceUsersErrorViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-destructive">
          ユーザ一覧の取得に失敗しました
          {status ? `（status: ${status}）` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * スペースユーザー管理画面のメッセージ表示を返します。
 */
function SpaceUsersMessage({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-rose-700">{message}</p>
      </CardContent>
    </Card>
  );
}
