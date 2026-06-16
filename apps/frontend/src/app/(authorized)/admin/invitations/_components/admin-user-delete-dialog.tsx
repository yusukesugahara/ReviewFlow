import { useId, type RefObject } from "react";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TenantUserSummary } from "@/lib/schema";

type AdminUserDeleteDialogProps = {
  deleteFormRef: RefObject<HTMLFormElement | null>;
  onClose: () => void;
  user: TenantUserSummary;
};

/**
 * テナントユーザー削除確認ダイアログを表示します。
 */
export function AdminUserDeleteDialog({
  deleteFormRef,
  onClose,
  user,
}: AdminUserDeleteDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogContent
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md"
      onClose={onClose}
    >
      <DialogHeader>
        <DialogTitle id={titleId}>ユーザを削除しますか</DialogTitle>
        <DialogDescription id={descriptionId}>
          {user.email} を削除済みにします。削除後もこの画面から復活できます。
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          キャンセル
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => deleteFormRef.current?.requestSubmit()}
        >
          削除
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
