"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReturnApplicationConfirmButtonProps = {
  formId: string;
};

/**
 * 申請差戻しフォームの確認付き送信ボタンを表示します。
 */
export function ReturnApplicationConfirmButton({
  formId,
}: ReturnApplicationConfirmButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
        選択した項目を差し戻す
      </Button>

      {isOpen ? (
        <DialogContent
          titleId="return-application-confirm-title"
          descriptionId="return-application-confirm-description"
          onClose={() => setIsOpen(false)}
        >
          <DialogHeader>
            <DialogTitle id="return-application-confirm-title">
              選択した項目を差し戻しますか
            </DialogTitle>
            <DialogDescription id="return-application-confirm-description">
              差し戻し対象の選択とコメント内容を確認してから実行してください。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" form={formId} variant="outline">
              差し戻す
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </>
  );
}
