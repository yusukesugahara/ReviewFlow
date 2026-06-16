"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type InlineInsertFieldButtonProps = {
  index: number;
  onInsert: (index: number) => void;
};

/**
 * インラインフォームビルダーへ項目を挿入するボタンを表示します。
 */
export function InlineInsertFieldButton({
  index,
  onInsert,
}: InlineInsertFieldButtonProps) {
  return (
    <div className="group relative h-4 bg-white">
      <div className="absolute inset-x-0 top-1/2 border-t border-transparent group-hover:border-slate-300" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 rounded-full bg-white p-0 shadow-sm"
          aria-label="フォームを追加"
          onClick={() => onInsert(index)}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
