"use client";

import { useState } from "react";
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
import { SPACE_ROLES } from "@/lib/constants/roles";
import { SpaceUserActionMenu } from "./space-user-action-menu";
import { SpaceUserDeleteDialog } from "./space-user-delete-dialog";
import { SpaceUserRoleDialog } from "./space-user-role-dialog";

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
  removeMemberAction: (groupId: string, userId: string) => Promise<void>;
  spaceId: string;
  updateMemberRoleAction: (
    groupId: string,
    userId: string,
    formData: FormData,
  ) => Promise<void>;
};

export type SpaceUserActionMenuState = {
  left: number;
  member: SpaceUserTableMember;
  top: number;
};

export function SpaceUsersTable({
  currentUserId,
  members,
  removeMemberAction,
  spaceId,
  updateMemberRoleAction,
}: SpaceUsersTableProps) {
  const [deleteTarget, setDeleteTarget] =
    useState<SpaceUserTableMember | null>(null);
  const [roleTarget, setRoleTarget] = useState<SpaceUserTableMember | null>(
    null,
  );
  const [actionMenu, setActionMenu] =
    useState<SpaceUserActionMenuState | null>(null);

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
        <SpaceUserActionMenu
          currentUserId={currentUserId}
          menu={actionMenu}
          onClose={() => setActionMenu(null)}
          onDelete={(member) => {
            setDeleteTarget(member);
            setActionMenu(null);
          }}
          onRoleChange={(member) => {
            setRoleTarget(member);
            setActionMenu(null);
          }}
        />
      ) : null}

      {deleteTarget ? (
        <SpaceUserDeleteDialog
          action={removeMemberAction.bind(null, spaceId, deleteTarget.userId)}
          onClose={() => setDeleteTarget(null)}
          target={deleteTarget}
        />
      ) : null}

      {roleTarget ? (
        <SpaceUserRoleDialog
          action={updateMemberRoleAction.bind(null, spaceId, roleTarget.userId)}
          onClose={() => setRoleTarget(null)}
          target={roleTarget}
        />
      ) : null}
    </>
  );
}
