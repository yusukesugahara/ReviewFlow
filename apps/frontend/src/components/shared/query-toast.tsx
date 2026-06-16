"use client";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

let lastToastKey: string | null = null;

/**
 * URL クエリに含まれる toast メッセージを表示します。
 */
export function QueryToast() {
  const searchParams = useSearchParams();
  const type = searchParams.get("toast");
  const message = searchParams.get("message");
  if ((type !== "success" && type !== "error") || !message) {
    return null;
  }

  const toastKey = `${type}:${message}`;

  return (
    <span
      hidden
      ref={(element) => {
        if (!element || lastToastKey === toastKey) {
          return;
        }
        lastToastKey = toastKey;
        if (type === "success") {
          toast.success(message);
          return;
        }
        toast.error(message);
      }}
    />
  );
}
