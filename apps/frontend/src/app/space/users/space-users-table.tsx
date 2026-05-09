"use client";

import { useId, useRef, useState } from "react";
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
import { SPACE_ROLES } from "@/lib/constants/roles";
import { removeSpaceMemberAction } from "./actions";

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

export function SpaceUsersTable({
  currentUserId,
  members,
  spaceId,
}: SpaceUsersTableProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<SpaceUserTableMember | null>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  function submitDelete() {
    const form = deleteFormRef.current;
    setDeleteTarget(null);
    form?.requestSubmit();
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名前</TableHead>
            <TableHead>メール</TableHead>
            <TableHead>スペースロール</TableHead>
            <TableHead>追加日</TableHead>
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
                {member.userId === currentUserId ? (
                  <span className="text-sm text-muted-foreground">
                    自分自身
                  </span>
                ) : (
                  <>
                    <form
                      action={removeSpaceMemberAction.bind(
                        null,
                        spaceId,
                        member.userId,
                      )}
                      ref={
                        deleteTarget?.userId === member.userId
                          ? deleteFormRef
                          : null
                      }
                    />
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => setDeleteTarget(member)}
                    >
                      削除
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {deleteTarget ? (
        <div
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 id={titleId} className="text-lg font-semibold text-slate-900">
              スペースメンバーを削除しますか
            </h3>
            <p id={descriptionId} className="mt-2 text-sm text-slate-600">
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
              <Button
                type="button"
                variant="destructive"
                onClick={submitDelete}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
