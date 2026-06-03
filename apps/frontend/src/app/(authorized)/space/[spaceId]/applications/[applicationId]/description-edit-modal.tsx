"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type DescriptionEditModalProps = {
  action: (formData: FormData) => Promise<void>;
  initialDescription: string;
};

export function DescriptionEditModal({
  action,
  initialDescription,
}: DescriptionEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        編集
      </Button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="説明編集モーダルを閉じる"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">説明欄を編集</h3>
              <p className="mt-1 text-sm text-slate-500">
                利用者に表示するフォーム説明を更新します。
              </p>
            </div>
            <form action={action} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-description">説明</Label>
                <Textarea
                  id="form-description"
                  name="description"
                  defaultValue={initialDescription}
                  rows={8}
                  placeholder="申請前に伝えたい内容を入力してください"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit">保存</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
