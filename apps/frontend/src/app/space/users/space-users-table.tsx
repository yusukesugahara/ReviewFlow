"use client";

import { useId, useState } from "react";
import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { spaceRoleLabel } from "@/lib/constants/role-labels";
import { SPACE_ROLE_OPTIONS, SPACE_ROLES } from "@/lib/constants/roles";
import {
  removeSpaceMemberAction,
  updateSpaceMemberRoleAction,
} from "./actions";

export type SpaceUserTableMember = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  createdAtLabel: string;
};

type SpaceUsersTableProps = {
  currentUserId: string | null;
  members: SpaceUserTableMember[];
  spaceId: string;
};

type ActionMenuState = {
  left: number;
  member: SpaceUserTableMember;
  top: number;
};

export function SpaceUsersTable({
  currentUserId,
  members,
  spaceId,
}: SpaceUsersTableProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<SpaceUserTableMember | null>(null);
  const [roleTarget, setRoleTarget] = useState<SpaceUserTableMember | null>(
    null,
  );
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const deleteTitleId = useId();
  const deleteDescriptionId = useId();
  const roleTitleId = useId();
  const roleDescriptionId = useId();

  function toggleActionMenu(
    member: SpaceUserTableMember,
    button: HTMLButtonElement,
  ) {
    if (actionMenu?.member.userId === member.userId) {
      setActionMenu(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 192;
    const viewportPadding = 16;
    setActionMenu({
      member,
      left: Math.max(
        viewportPadding,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
      ),
      top: rect.bottom + 4,
    });
  }

  return (
    <>
      <Table className="min-w-[820px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">名前</TableHead>
            <TableHead className="w-[33%]">メール</TableHead>
            <TableHead className="w-[22%]">スペースロール</TableHead>
            <TableHead className="w-[15%]">追加日</TableHead>
            <TableHead className="w-[10%] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="truncate font-medium">
                {member.name ?? "-"}
              </TableCell>
              <TableCell className="truncate font-mono text-xs">
                {member.email}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    member.role === SPACE_ROLES.admin ? "default" : "outline"
                  }
                >
                  {spaceRoleLabel(member.role)}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {member.createdAtLabel}
              </TableCell>
              <TableCell className="text-right">
                <div className="relative inline-flex">
                  <Button
                    aria-expanded={actionMenu?.member.userId === member.userId}
                    aria-haspopup="menu"
                    aria-label={`${member.email} の操作`}
                    className="h-8 w-8 p-0"
                    type="button"
                    variant="ghost"
                    onClick={(event) =>
                      toggleActionMenu(member, event.currentTarget)
                    }
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {actionMenu ? (
        <>
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setActionMenu(null)}
          />
          <div
            className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
            role="menu"
            style={{ left: actionMenu.left, top: actionMenu.top }}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setActionMenu(null);
              }
            }}
          >
            <button
              type="button"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
              role="menuitem"
              onClick={() => {
                setRoleTarget(actionMenu.member);
                setActionMenu(null);
              }}
            >
              スペースロールを変更
            </button>
            {actionMenu.member.userId === currentUserId ? (
              <span className="block px-3 py-2 text-sm text-muted-foreground">
                自分自身
              </span>
            ) : (
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
                role="menuitem"
                onClick={() => {
                  setDeleteTarget(actionMenu.member);
                  setActionMenu(null);
                }}
              >
                削除
              </button>
            )}
          </div>
        </>
      ) : null}

      {deleteTarget ? (
        <div
          aria-describedby={deleteDescriptionId}
          aria-labelledby={deleteTitleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <form
            action={removeSpaceMemberAction.bind(
              null,
              spaceId,
              deleteTarget.userId,
            )}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3
              id={deleteTitleId}
              className="text-lg font-semibold text-slate-900"
            >
              スペースメンバーを削除しますか
            </h3>
            <p
              id={deleteDescriptionId}
              className="mt-2 text-sm text-slate-600"
            >
              {deleteTarget.email} をこのスペースから削除します。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                キャンセル
              </Button>
              <Button type="submit" variant="destructive">
                削除
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {roleTarget ? (
        <div
          aria-describedby={roleDescriptionId}
          aria-labelledby={roleTitleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <form
            action={updateSpaceMemberRoleAction.bind(
              null,
              spaceId,
              roleTarget.userId,
            )}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3 id={roleTitleId} className="text-lg font-semibold text-slate-900">
              スペースロールを変更
            </h3>
            <p id={roleDescriptionId} className="mt-2 text-sm text-slate-600">
              {roleTarget.email} のスペースロールを変更します。
            </p>
            <label
              className="mt-5 block text-sm font-medium text-slate-700"
              htmlFor="space-role"
            >
              スペースロール
            </label>
            <select
              id="space-role"
              name="role"
              defaultValue={roleTarget.role}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {SPACE_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleTarget(null)}
              >
                キャンセル
              </Button>
              <Button type="submit">保存</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
