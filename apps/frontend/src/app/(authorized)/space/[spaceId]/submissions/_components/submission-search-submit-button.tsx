"use client";

import { Loader2, Search } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/**
 * 提出一覧検索フォームの送信ボタンを表示します。
 */
export function SubmissionSearchSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="bg-white" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          <span className="sr-only">検索中</span>
        </>
      ) : (
        <>
          <Search aria-hidden="true" />
          検索
        </>
      )}
    </Button>
  );
}
