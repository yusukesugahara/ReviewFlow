"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";

type CopyButtonProps = {
  copiedLabel?: string;
  label?: string;
  size?: ButtonProps["size"];
  value: string;
  variant?: ButtonProps["variant"];
};

export function CopyButton({
  copiedLabel = "コピー済み",
  label = "URLをコピー",
  size = "sm",
  value,
  variant = "outline",
}: CopyButtonProps) {
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
    <Button type="button" variant={variant} size={size} onClick={onCopy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}
