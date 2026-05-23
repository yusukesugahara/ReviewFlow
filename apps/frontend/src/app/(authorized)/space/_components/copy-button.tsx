"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  value: string;
};

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onCopy}>
      {copied ? "コピー済み" : "URLをコピー"}
    </Button>
  );
}
