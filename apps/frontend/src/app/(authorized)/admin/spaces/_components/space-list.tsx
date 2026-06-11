"use client";

import { useState } from "react";
import { MoreVertical, Trash2, UserRoundPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { spaceRoleLabel } from "@/lib/constants/role-labels";
import {
  SPACE_ROLE_OPTIONS,
  SPACE_ROLES,
  TENANT_ROLE_OPTIONS,
  TENANT_ROLES,
} from "@/lib/constants/roles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  GroupMemberSummary,
  SpaceListItem,
} from "../types";
import {
  MemberActionMenu,
  type MemberActionMenuState,
} from "./member-action-menu";

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
        const hasAddableUsers = addableUsers.length > 0;

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
                  {members.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      メンバーを表示できません
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>名前</TableHead>
                          <TableHead>メール</TableHead>
                          <TableHead>スペースロール</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.name ?? "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {member.email}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  member.role === "admin"
                                    ? "default"
                                    : "outline"
                                }
                              >
                                {spaceRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {canManageSpace ||
                              member.userId === currentUserId ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-haspopup="menu"
                                  aria-expanded={
                                    memberActionMenu?.groupId === group.id &&
                                    memberActionMenu.member.userId ===
                                      member.userId
                                  }
                                  aria-label={`${member.email} の操作`}
                                  onClick={(event) =>
                                    toggleMemberActionMenu(
                                      group.id,
                                      member,
                                      event.currentTarget,
                                    )
                                  }
                                >
                                  <MoreVertical aria-hidden="true" />
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                {memberAddSpaceId === group.id ? (
                  <DialogContent
                    titleId={`member-add-title-${group.id}`}
                    descriptionId={`member-add-description-${group.id}`}
                    className="max-w-4xl"
                    onClose={() => setMemberAddSpaceId(null)}
                  >
                    <DialogHeader>
                      <DialogTitle id={`member-add-title-${group.id}`}>
                        メンバーを追加
                      </DialogTitle>
                      <DialogDescription id={`member-add-description-${group.id}`}>
                        {group.name} に既存ユーザを追加、またはメールで招待します。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid items-stretch gap-3 xl:grid-cols-2">
                      {isSystemAdmin ? (
                        <form
                          action={addMemberAction.bind(null, group.id)}
                          className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] xl:h-full"
                        >
                          <div className="space-y-1 md:col-span-3">
                            <p className="text-sm font-medium">
                              既存ユーザを追加
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`add-user-${group.id}`}>
                              ユーザ
                            </Label>
                            <Select
                              name="userId"
                              required
                              disabled={!hasAddableUsers}
                            >
                              <SelectTrigger
                                id={`add-user-${group.id}`}
                                className="bg-background"
                              >
                                <SelectValue
                                  placeholder={
                                    hasAddableUsers
                                      ? "追加するユーザを選択"
                                      : "追加できるユーザがいません"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {addableUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name ?? user.email} / {user.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`add-role-${group.id}`}>
                              スペースロール
                            </Label>
                            <Select name="role" defaultValue={SPACE_ROLES.user}>
                              <SelectTrigger
                                id={`add-role-${group.id}`}
                                className="bg-background"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SPACE_ROLE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <span className="block h-5" aria-hidden="true" />
                            <Button type="submit" disabled={!hasAddableUsers}>
                              追加
                            </Button>
                          </div>
                        </form>
                      ) : null}

                      <form
                        action={inviteSpaceMemberAction.bind(null, group.id)}
                        className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_140px_auto] xl:h-full"
                      >
                        <div className="space-y-1 md:col-span-4">
                          <p className="text-sm font-medium">
                            メールでスペースへ招待
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`invite-email-${group.id}`}>
                            メール
                          </Label>
                          <Input
                            id={`invite-email-${group.id}`}
                            name="email"
                            type="email"
                            required
                            placeholder="member@example.com"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`tenant-role-${group.id}`}>
                            全体ロール
                          </Label>
                          <Select
                            name="tenantRole"
                            defaultValue={TENANT_ROLES.user}
                          >
                            <SelectTrigger
                              id={`tenant-role-${group.id}`}
                              className="bg-background"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TENANT_ROLE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`group-role-${group.id}`}>
                            スペースロール
                          </Label>
                          <Select
                            name="groupRole"
                            defaultValue={SPACE_ROLES.user}
                          >
                            <SelectTrigger
                              id={`group-role-${group.id}`}
                              className="bg-background"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SPACE_ROLE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <span className="block h-5" aria-hidden="true" />
                          <Button type="submit">招待</Button>
                        </div>
                      </form>
                    </div>
                  </DialogContent>
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
