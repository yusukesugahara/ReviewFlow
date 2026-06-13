"use client";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupSummary } from "../types";

type SpaceDetailsEditDialogProps = {
  group: GroupSummary;
  onClose: () => void;
  updateSpaceAction: (groupId: string, formData: FormData) => Promise<void>;
};

export function SpaceDetailsEditDialog({
  group,
  onClose,
  updateSpaceAction,
}: SpaceDetailsEditDialogProps) {
  const titleId = `space-edit-title-${group.id}`;
  const descriptionId = `space-edit-description-${group.id}`;

  return (
    <DialogContent
      titleId={titleId}
      descriptionId={descriptionId}
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id={titleId}>スペースを編集</DialogTitle>
        <DialogDescription id={descriptionId}>
          スペース名と説明文を変更します。
        </DialogDescription>
      </DialogHeader>
      <form
        action={updateSpaceAction.bind(null, group.id)}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor={`space-name-${group.id}`}>スペース名</Label>
          <Input
            id={`space-name-${group.id}`}
            name="name"
            required
            defaultValue={group.name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`space-description-${group.id}`}>説明文</Label>
          <Textarea
            id={`space-description-${group.id}`}
            name="description"
            rows={4}
            defaultValue={group.description ?? ""}
            placeholder="スペースの用途や範囲"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
