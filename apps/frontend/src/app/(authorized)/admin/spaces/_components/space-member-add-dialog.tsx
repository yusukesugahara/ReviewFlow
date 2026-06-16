"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  SPACE_ROLE_OPTIONS,
  SPACE_ROLES,
  TENANT_ROLE_OPTIONS,
  TENANT_ROLES,
} from "@/lib/constants/roles";
import type { AvailableUserSummary, GroupSummary } from "../types";

type SpaceMemberAddDialogProps = {
  addableUsers: AvailableUserSummary[];
  addMemberAction: (groupId: string, formData: FormData) => Promise<void>;
  group: GroupSummary;
  inviteSpaceMemberAction: (
    groupId: string,
    formData: FormData,
  ) => Promise<void>;
  isSystemAdmin: boolean;
  onClose: () => void;
};

/**
 * スペースメンバー追加ダイアログを表示します。
 */
export function SpaceMemberAddDialog({
  addableUsers,
  addMemberAction,
  group,
  inviteSpaceMemberAction,
  isSystemAdmin,
  onClose,
}: SpaceMemberAddDialogProps) {
  return (
    <DialogContent
      titleId={`member-add-title-${group.id}`}
      descriptionId={`member-add-description-${group.id}`}
      className="max-w-4xl"
      onClose={onClose}
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
          <ExistingUserAddForm
            addableUsers={addableUsers}
            addMemberAction={addMemberAction}
            groupId={group.id}
          />
        ) : null}

        <InviteSpaceMemberForm
          groupId={group.id}
          inviteSpaceMemberAction={inviteSpaceMemberAction}
        />
      </div>
    </DialogContent>
  );
}

/**
 * 既存ユーザーをスペースに追加するフォームを表示します。
 */
function ExistingUserAddForm({
  addableUsers,
  addMemberAction,
  groupId,
}: {
  addableUsers: AvailableUserSummary[];
  addMemberAction: (groupId: string, formData: FormData) => Promise<void>;
  groupId: string;
}) {
  const hasAddableUsers = addableUsers.length > 0;

  return (
    <form
      action={addMemberAction.bind(null, groupId)}
      className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] xl:h-full"
    >
      <div className="space-y-1 md:col-span-3">
        <p className="text-sm font-medium">既存ユーザを追加</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`add-user-${groupId}`}>ユーザ</Label>
        <Select name="userId" required disabled={!hasAddableUsers}>
          <SelectTrigger id={`add-user-${groupId}`} className="bg-background">
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
        <Label htmlFor={`add-role-${groupId}`}>スペースロール</Label>
        <Select name="role" defaultValue={SPACE_ROLES.user}>
          <SelectTrigger id={`add-role-${groupId}`} className="bg-background">
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
        <Button type="submit" disabled={!hasAddableUsers}>
          追加
        </Button>
      </div>
    </form>
  );
}

/**
 * 新しいユーザーをスペースへ招待するフォームを表示します。
 */
function InviteSpaceMemberForm({
  groupId,
  inviteSpaceMemberAction,
}: {
  groupId: string;
  inviteSpaceMemberAction: (
    groupId: string,
    formData: FormData,
  ) => Promise<void>;
}) {
  return (
    <form
      action={inviteSpaceMemberAction.bind(null, groupId)}
      className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_140px_auto] xl:h-full"
    >
      <div className="space-y-1 md:col-span-4">
        <p className="text-sm font-medium">メールでスペースへ招待</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`invite-email-${groupId}`}>メール</Label>
        <Input
          id={`invite-email-${groupId}`}
          name="email"
          type="email"
          required
          placeholder="member@example.com"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`tenant-role-${groupId}`}>全体ロール</Label>
        <Select name="tenantRole" defaultValue={TENANT_ROLES.user}>
          <SelectTrigger id={`tenant-role-${groupId}`} className="bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TENANT_ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`group-role-${groupId}`}>スペースロール</Label>
        <Select name="groupRole" defaultValue={SPACE_ROLES.user}>
          <SelectTrigger id={`group-role-${groupId}`} className="bg-background">
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
        <Button type="submit">招待</Button>
      </div>
    </form>
  );
}
