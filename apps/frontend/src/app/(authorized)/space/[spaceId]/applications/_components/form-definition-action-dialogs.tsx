"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveFormDefinitionAction,
  restoreFormDefinitionAction,
} from "@/app/(authorized)/space/[spaceId]/applications/actions";
import type { ApplicationFormListRow } from "../_utils/space-applications.helpers";

type FormDefinitionActionDialogProps = {
  onCancel: () => void;
  spaceId: string;
  target: ApplicationFormListRow;
};

export function FormDefinitionArchiveDialog({
  onCancel,
  spaceId,
  target,
}: FormDefinitionActionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogContent
      descriptionId={descriptionId}
      titleId={titleId}
      onClose={onCancel}
    >
      <form
        action={archiveFormDefinitionAction.bind(null, target.definitionId, spaceId)}
        className="space-y-5"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>申請フォームを削除しますか</DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.title} を削除済みに移動します。削除済み一覧から復元できます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
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

export function FormDefinitionRestoreDialog({
  onCancel,
  spaceId,
  target,
}: FormDefinitionActionDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <DialogContent
      descriptionId={descriptionId}
      titleId={titleId}
      onClose={onCancel}
    >
      <form
        action={restoreFormDefinitionAction.bind(null, target.definitionId, spaceId)}
        className="space-y-5"
      >
        <DialogHeader>
          <DialogTitle id={titleId}>申請フォームを復元しますか</DialogTitle>
          <DialogDescription id={descriptionId}>
            {target.title} を申請フォーム一覧へ戻します。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="submit">復元</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
