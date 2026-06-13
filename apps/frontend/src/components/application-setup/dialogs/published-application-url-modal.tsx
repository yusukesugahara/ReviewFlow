"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/shared/copy-button";

type PublishedApplicationUrlModalProps = {
  groupId?: string;
  formDefinitionId?: string;
  open: boolean;
};

export function PublishedApplicationUrlModal({
  groupId,
  formDefinitionId,
  open,
}: PublishedApplicationUrlModalProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  const applicationPath = useMemo(() => {
    if (!groupId) {
      return "";
    }
    const path = `/apply/${encodeURIComponent(groupId)}`;
    if (!formDefinitionId) {
      return path;
    }
    return `${path}?formDefinitionId=${encodeURIComponent(formDefinitionId)}`;
  }, [formDefinitionId, groupId]);

  const applicationUrl = origin && applicationPath ? `${origin}${applicationPath}` : applicationPath;

  if (!isOpen || !applicationUrl) {
    return null;
  }

  return (
    <DialogContent
      className="max-w-2xl"
      titleId="published-application-url-title"
      descriptionId="published-application-url-description"
      onClose={() => setIsOpen(false)}
    >
      <DialogHeader>
        <DialogTitle id="published-application-url-title">
          申請URLを発行しました
        </DialogTitle>
        <DialogDescription id="published-application-url-description">
          このURLをユーザに共有すると、メールアドレス入力後に申請フォームの案内を送れます。
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="break-all font-mono text-sm text-slate-700" suppressHydrationWarning>
          {applicationUrl}
        </p>
      </div>
      <DialogFooter>
        <CopyButton value={applicationUrl} />
        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
          閉じる
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
