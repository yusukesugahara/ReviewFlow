"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AvailableUserSummary,
  GroupMemberSummary,
  GroupSummary,
} from "../types";

type SpaceListItem = {
  group: GroupSummary;
  members: GroupMemberSummary[];
  addableUsers: AvailableUserSummary[];
  canManageSpace: boolean;
};

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
                    {isSystemAdmin ? (
                      <form action={removeSpaceAction.bind(null, group.id)}>
                        <Button size="sm" type="submit" variant="outline">
                          削除
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {canManageSpace ? (
                    <div className="grid gap-3">
                      <form
                        action={addMemberAction.bind(null, group.id)}
                        className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto]"
                      >
                        <div className="space-y-1 md:col-span-3">
                          <p className="text-sm font-medium">
                            既存ユーザーを追加
                          </p>
                        </div>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          name="userId"
                          required
                        >
                          <option value="">追加するユーザーを選択</option>
                          {addableUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name ?? user.email} / {user.email}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          name="role"
                          defaultValue={SPACE_ROLES.user}
                        >
                          {SPACE_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" type="submit">
                          追加
                        </Button>
                      </form>

                      <form
                        action={inviteSpaceMemberAction.bind(null, group.id)}
                        className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_140px_auto]"
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
                          <select
                            id={`tenant-role-${group.id}`}
                            name="tenantRole"
                            defaultValue={TENANT_ROLES.user}
                            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {TENANT_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`group-role-${group.id}`}>
                            スペースロール
                          </Label>
                          <select
                            id={`group-role-${group.id}`}
                            name="groupRole"
                            defaultValue={SPACE_ROLES.user}
                            className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          >
                            {SPACE_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button size="sm" type="submit">
                            招待
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : null}

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
                            <TableCell className="space-x-2 text-right">
                              {canManageSpace ? (
                                <form
                                  action={updateMemberRoleAction.bind(
                                    null,
                                    group.id,
                                    member.userId,
                                  )}
                                  className="inline-flex items-center gap-2"
                                >
                                  <select
                                    name="role"
                                    defaultValue={member.role}
                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                                  >
                                    {SPACE_ROLE_OPTIONS.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    更新
                                  </Button>
                                </form>
                              ) : null}
                              {member.userId === currentUserId ? (
                                <form
                                  action={leaveSpaceAction.bind(null, group.id)}
                                  className="inline-flex"
                                >
                                  <Button
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    退出
                                  </Button>
                                </form>
                              ) : canManageSpace ? (
                                <form
                                  action={removeMemberAction.bind(
                                    null,
                                    group.id,
                                    member.userId,
                                  )}
                                  className="inline-flex"
                                >
                                  <Button
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    外す
                                  </Button>
                                </form>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
