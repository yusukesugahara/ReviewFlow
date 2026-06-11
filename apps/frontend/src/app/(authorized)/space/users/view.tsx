"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SPACE_ROLE_OPTIONS, SPACE_ROLES } from "@/lib/constants/roles";
import { formatDateJa } from "@/lib/date-format";
import {
  addSpaceMemberAction,
  removeSpaceMemberAction,
  updateSpaceMemberRoleAction,
} from "./actions";
import { SpaceUsersTable } from "./space-users-table";
import type { SpaceUsersErrorViewProps, SpaceUsersViewProps } from "./types";

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
  const hasAvailableUsers = availableUsers.length > 0;

  return (
    <div className="space-y-6">
      {error ? <SpaceUsersMessage message={error} /> : null}
      {formError ? <SpaceUsersMessage message={formError} /> : null}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>スペースユーザ一覧</CardTitle>
              <CardDescription>
                {members.length}名のユーザが参加しています
              </CardDescription>
            </div>
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
              members={members.map((member) => ({
                ...member,
                createdAtLabel: formatDateJa(member.createdAt),
              }))}
              removeMemberAction={removeSpaceMemberAction}
              spaceId={spaceId}
              updateMemberRoleAction={updateSpaceMemberRoleAction}
            />
          )}
        </CardContent>
      </Card>

      {isAddMemberOpen ? (
        <DialogContent
          titleId="space-user-add-title"
          descriptionId="space-user-add-description"
          onClose={() => setIsAddMemberOpen(false)}
        >
          <DialogHeader>
            <DialogTitle id="space-user-add-title">
              ユーザをスペースに追加
            </DialogTitle>
            <DialogDescription id="space-user-add-description">
              同一テナント内の既存ユーザを選択して、このスペースへ追加します
            </DialogDescription>
          </DialogHeader>
          <form
            action={addSpaceMemberAction.bind(null, spaceId)}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="space-user-add-user">ユーザ</Label>
              <Select name="userId" required disabled={!hasAvailableUsers}>
                <SelectTrigger id="space-user-add-user" className="bg-background">
                  <SelectValue
                    placeholder={
                      hasAvailableUsers
                        ? "追加するユーザを選択"
                        : "追加できるユーザがいません"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name ?? user.email} / {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="space-user-add-role">スペースロール</Label>
              <Select
                name="role"
                defaultValue={SPACE_ROLES.user}
                disabled={!hasAvailableUsers}
              >
                <SelectTrigger id="space-user-add-role" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="block h-5" aria-hidden="true" />
              <Button type="submit" disabled={!hasAvailableUsers}>
                追加
              </Button>
            </div>
          </form>
        </DialogContent>
      ) : null}
    </div>
  );
}

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

function SpaceUsersMessage({ message }: { message: string }) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardContent className="pt-6">
        <p className="text-sm font-medium text-rose-700">{message}</p>
      </CardContent>
    </Card>
  );
}
