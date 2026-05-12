"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "./copy-button";

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
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">申請URLを発行しました</h3>
          <p className="mt-1 text-sm text-slate-600">
            このURLをユーザーに共有すると、メールアドレス入力後に申請フォームの案内を送れます。
          </p>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="break-all font-mono text-sm text-slate-700">{applicationUrl}</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <CopyButton value={applicationUrl} />
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
