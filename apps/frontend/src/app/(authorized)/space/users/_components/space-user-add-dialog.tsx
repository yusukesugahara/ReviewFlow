"use client";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPACE_ROLE_OPTIONS, SPACE_ROLES } from "@/lib/constants/roles";
import { addSpaceMemberAction } from "../actions";
import type { SpaceUsersAvailableUser } from "../types";

type SpaceUserAddDialogProps = {
  availableUsers: SpaceUsersAvailableUser[];
  onClose: () => void;
  spaceId: string;
};

export function SpaceUserAddDialog({
  availableUsers,
  onClose,
  spaceId,
}: SpaceUserAddDialogProps) {
  const hasAvailableUsers = availableUsers.length > 0;

  return (
    <DialogContent
      titleId="space-user-add-title"
      descriptionId="space-user-add-description"
      onClose={onClose}
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
  );
}
