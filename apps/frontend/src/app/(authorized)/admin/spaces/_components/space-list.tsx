"use client";

import { useState } from "react";
import { Trash2, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GroupMemberSummary, SpaceListItem } from "../types";
import {
  MemberActionMenu,
  type MemberActionMenuState,
} from "./member-action-menu";
import { SpaceMemberAddDialog } from "./space-member-add-dialog";
import { SpaceMemberTable } from "./space-member-table";

type SpaceListProps = {
  spaces: SpaceListItem[];
  currentUserId: string | null;
  isSystemAdmin: boolean;
  addMemberAction: (groupId: string, formData: FormData) => Promise<void>;
  inviteSpaceMemberAction: (
    groupId: string,
    formData: FormData,
  ) => Promise<void>;
  updateMemberRoleAction: (
    groupId: string,
    userId: string,
    formData: FormData,
  ) => Promise<void>;
  removeMemberAction: (groupId: string, userId: string) => Promise<void>;
  leaveSpaceAction: (groupId: string) => Promise<void>;
  removeSpaceAction: (groupId: string) => Promise<void>;
};

export function SpaceList({
  spaces,
  currentUserId,
  isSystemAdmin,
  addMemberAction,
  inviteSpaceMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
  leaveSpaceAction,
  removeSpaceAction,
}: SpaceListProps) {
  const [openSpaceId, setOpenSpaceId] = useState<string | null>(null);
  const [memberAddSpaceId, setMemberAddSpaceId] = useState<string | null>(null);
  const [memberActionMenu, setMemberActionMenu] =
    useState<MemberActionMenuState | null>(null);

  function toggleMemberActionMenu(
    groupId: string,
    member: GroupMemberSummary,
    trigger: HTMLButtonElement,
  ) {
    if (
      memberActionMenu?.groupId === groupId &&
      memberActionMenu.member.userId === member.userId
    ) {
      setMemberActionMenu(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 192;
    const viewportPadding = 16;
    setMemberActionMenu({
      groupId,
      member,
      left: Math.max(
        viewportPadding,
        Math.min(
          rect.right - menuWidth,
          window.innerWidth - menuWidth - viewportPadding,
        ),
      ),
      top: rect.bottom + 4,
    });
  }

  function closeMemberActionMenu() {
    setMemberActionMenu(null);
  }

  return (
    <div className="space-y-3">
      {spaces.map(({ group, members, addableUsers, canManageSpace }) => {
        const isOpen = openSpaceId === group.id;

        return (
          <Card key={group.id} className="overflow-hidden">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-violet-50/70 focus-visible:bg-violet-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              aria-expanded={isOpen}
              onClick={() => setOpenSpaceId(isOpen ? null : group.id)}
            >
              <div className="min-w-0 space-y-1">
                <CardTitle className="truncate text-lg">{group.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {group.description ?? "説明は設定されていません"}
                </CardDescription>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {isOpen ? "閉じる" : "詳細"}
              </span>
            </button>

            {isOpen ? (
              <>
                <CardHeader className="border-t border-slate-200">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-base">メンバー管理</CardTitle>
                      <CardDescription>
                        メンバー追加、招待、ロール変更、退出を操作できます
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManageSpace ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label="メンバーを追加または招待"
                                onClick={() => setMemberAddSpaceId(group.id)}
                              >
                                <UserRoundPlus aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>メンバーを追加または招待</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                      {isSystemAdmin ? (
                        <form action={removeSpaceAction.bind(null, group.id)}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  type="submit"
                                  variant="outline"
                                  aria-label="スペースを削除"
                                >
                                  <Trash2 aria-hidden="true" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>スペースを削除</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <SpaceMemberTable
                    canManageSpace={canManageSpace}
                    currentUserId={currentUserId}
                    groupId={group.id}
                    memberActionMenu={memberActionMenu}
                    members={members}
                    onMemberActionMenuToggle={toggleMemberActionMenu}
                  />
                </CardContent>
                {memberAddSpaceId === group.id ? (
                  <SpaceMemberAddDialog
                    addableUsers={addableUsers}
                    addMemberAction={addMemberAction}
                    group={group}
                    inviteSpaceMemberAction={inviteSpaceMemberAction}
                    isSystemAdmin={isSystemAdmin}
                    onClose={() => setMemberAddSpaceId(null)}
                  />
                ) : null}
                {memberActionMenu?.groupId === group.id ? (
                  <MemberActionMenu
                    canManageSpace={canManageSpace}
                    currentUserId={currentUserId}
                    groupId={group.id}
                    leaveSpaceAction={leaveSpaceAction}
                    menu={memberActionMenu}
                    onClose={closeMemberActionMenu}
                    removeMemberAction={removeMemberAction}
                    updateMemberRoleAction={updateMemberRoleAction}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
