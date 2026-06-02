"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ReturnApplicationConfirmButtonProps = {
  formId: string;
};

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-application-confirm-title"
        >
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2
                id="return-application-confirm-title"
                className="text-lg font-semibold text-slate-950"
              >
                選択した項目を差し戻しますか
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                差し戻し対象の選択とコメント内容を確認してから実行してください。
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-5">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" form={formId} variant="outline">
                差し戻す
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
