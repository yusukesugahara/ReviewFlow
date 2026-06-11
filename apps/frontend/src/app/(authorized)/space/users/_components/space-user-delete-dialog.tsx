import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SpaceUserTableMember } from "../space-users-table";

type SpaceUserDeleteDialogProps = {
  action: () => Promise<void>;
  onClose: () => void;
  target: SpaceUserTableMember;
};

export function SpaceUserDeleteDialog({
  action,
  onClose,
  target,
}: SpaceUserDeleteDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogContent
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md"
      onClose={onClose}
    >
      <form action={action} className="space-y-5">
        <DialogHeader>
          <DialogTitle id={titleId}>
            スペースメンバーを削除しますか
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.email} をこのスペースから削除します。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="destructive">
            削除
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
