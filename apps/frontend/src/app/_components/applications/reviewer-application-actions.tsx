"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ApplicationCapabilities } from "./application-capabilities";

type ReviewerApplicationActionsProps = {
  capabilities: Pick<
    ApplicationCapabilities,
    "canApproveApplication" | "canRejectApplication"
  >;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
};

export function ReviewerApplicationActions({
  capabilities,
  approveAction,
  rejectAction,
}: ReviewerApplicationActionsProps) {
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);

  if (
    !capabilities.canApproveApplication &&
    !capabilities.canRejectApplication
  ) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {capabilities.canApproveApplication ? (
          <Button type="button" onClick={() => setConfirmAction("approve")}>
            承認する
          </Button>
        ) : null}
        {capabilities.canRejectApplication ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmAction("reject")}
          >
            却下する
          </Button>
        ) : null}
      </div>

      <ApplicationDecisionDialog
        action={confirmAction}
        approveAction={approveAction}
        rejectAction={rejectAction}
        onClose={() => setConfirmAction(null)}
      />
    </>
  );
}

function ApplicationDecisionDialog({
  action,
  approveAction,
  rejectAction,
  onClose,
}: {
  action: "approve" | "reject" | null;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  if (!action) {
    return null;
  }

  const isApprove = action === "approve";
  const title = isApprove ? "申請を承認しますか" : "申請を却下しますか";
  const description = isApprove
    ? "承認コメントがあれば入力してから承認してください。"
    : "却下理由があれば入力してから却下してください。";
  const textareaId = isApprove ? "approve-comment" : "reject-comment";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-decision-title"
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 id="application-decision-title" className="text-lg font-semibold text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <form action={isApprove ? approveAction : rejectAction} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor={textareaId}>コメント（任意）</Label>
            <Textarea
              id={textareaId}
              name="comment"
              placeholder={isApprove ? "承認コメント" : "却下理由"}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <DecisionSubmitButton variant={isApprove ? "default" : "destructive"}>
              {isApprove ? "承認する" : "却下する"}
            </DecisionSubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function DecisionSubmitButton({
  children,
  variant,
}: {
  children: string;
  variant: "default" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "処理中..." : children}
    </Button>
  );
}
