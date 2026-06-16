"use client";

import { MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { spaceRoleLabel } from "@/lib/constants/role-labels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GroupMemberSummary } from "../types";
import type { MemberActionMenuState } from "./member-action-menu";

type SpaceMemberTableProps = {
  canManageSpace: boolean;
  currentUserId: string | null;
  groupId: string;
  memberActionMenu: MemberActionMenuState | null;
  members: GroupMemberSummary[];
  onMemberActionMenuToggle: (
    groupId: string,
    member: GroupMemberSummary,
    trigger: HTMLButtonElement,
  ) => void;
};

/**
 * スペースメンバー一覧をテーブルとして表示します。
 */
export function SpaceMemberTable({
  canManageSpace,
  currentUserId,
  groupId,
  memberActionMenu,
  members,
  onMemberActionMenuToggle,
}: SpaceMemberTableProps) {
  if (members.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        メンバーを表示できません
      </p>
    );
  }

  return (
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
            <TableCell className="font-medium">{member.name ?? "-"}</TableCell>
            <TableCell className="font-mono text-xs">{member.email}</TableCell>
            <TableCell>
              <Badge variant={member.role === "admin" ? "default" : "outline"}>
                {spaceRoleLabel(member.role)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {canManageSpace || member.userId === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-haspopup="menu"
                  aria-expanded={
                    memberActionMenu?.groupId === groupId &&
                    memberActionMenu.member.userId === member.userId
                  }
                  aria-label={`${member.email} の操作`}
                  onClick={(event) =>
                    onMemberActionMenuToggle(
                      groupId,
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
  );
}
