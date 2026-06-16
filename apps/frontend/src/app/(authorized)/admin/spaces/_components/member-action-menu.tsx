"use client";

import { SPACE_ROLES } from "@/lib/constants/roles";
import type { GroupMemberSummary } from "../types";

export type MemberActionMenuState = {
  groupId: string;
  member: GroupMemberSummary;
  left: number;
  top: number;
};

/**
 * スペースメンバーの操作メニューを表示します。
 */
export function MemberActionMenu({
  canManageSpace,
  currentUserId,
  groupId,
  leaveSpaceAction,
  menu,
  onClose,
  removeMemberAction,
  updateMemberRoleAction,
}: {
  canManageSpace: boolean;
  currentUserId: string | null;
  groupId: string;
  leaveSpaceAction: (groupId: string) => Promise<void>;
  menu: MemberActionMenuState;
  onClose: () => void;
  removeMemberAction: (groupId: string, userId: string) => Promise<void>;
  updateMemberRoleAction: (
    groupId: string,
    userId: string,
    formData: FormData,
  ) => Promise<void>;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="メニューを閉じる"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
        role="menu"
        style={{ left: menu.left, top: menu.top }}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        {canManageSpace ? (
          <form
            action={updateMemberRoleAction.bind(
              null,
              groupId,
              menu.member.userId,
            )}
          >
            <input
              type="hidden"
              name="role"
              value={
                menu.member.role === SPACE_ROLES.admin
                  ? SPACE_ROLES.user
                  : SPACE_ROLES.admin
              }
            />
            <button
              type="submit"
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none"
              role="menuitem"
            >
              {menu.member.role === SPACE_ROLES.admin
                ? "メンバーに変更"
                : "管理者に変更"}
            </button>
          </form>
        ) : null}
        {menu.member.userId === currentUserId ? (
          <form action={leaveSpaceAction.bind(null, groupId)}>
            <button
              type="submit"
              className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
              role="menuitem"
            >
              退出
            </button>
          </form>
        ) : canManageSpace ? (
          <form action={removeMemberAction.bind(null, groupId, menu.member.userId)}>
            <button
              type="submit"
              className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
              role="menuitem"
            >
              外す
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
