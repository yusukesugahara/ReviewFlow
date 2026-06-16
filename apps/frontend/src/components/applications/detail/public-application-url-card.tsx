"use client";

import { useMemo, useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PublicApplicationUrlCopyButtonProps = {
  path: string;
};

/**
 * 公開申請フォーム URL のコピー操作を表示します。
 */
export function PublicApplicationUrlCopyButton({
  path,
}: PublicApplicationUrlCopyButtonProps) {
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    return origin ? `${origin}${path}` : path;
  }, [origin, path]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("公開URLをコピーしました");
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      toast.error("公開URLのコピーに失敗しました");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCopy}
            aria-label={copied ? "公開URLをコピー済み" : "公開URLをコピー"}
            suppressHydrationWarning
          >
            <LinkIcon aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "コピー済み" : "公開URLをコピー"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
