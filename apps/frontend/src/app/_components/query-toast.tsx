"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function QueryToast() {
  const searchParams = useSearchParams();
  const lastToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const type = searchParams.get("toast");
    const message = searchParams.get("message");
    if ((type !== "success" && type !== "error") || !message) {
      return;
    }

    const toastKey = `${type}:${message}`;
    if (lastToastKeyRef.current === toastKey) {
      return;
    }
    lastToastKeyRef.current = toastKey;

    if (type === "success") {
      toast.success(message);
      return;
    }
    toast.error(message);
  }, [searchParams]);

  return null;
}
