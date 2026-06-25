import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationCapabilities } from "./application-capabilities";
type ApplicantApplicationActionsProps = {
  capabilities: Pick<
    ApplicationCapabilities,
    "canEditApplication" | "canSubmitApplication" | "canResubmitApplication"
  >;
  canResendReturnEmail?: boolean;
  editHref: string;
  resendReturnEmailAction?: () => Promise<void>;
  submitAction: () => Promise<void>;
  resubmitAction: (formData: FormData) => Promise<void>;
};

/**
 * 申請者が実行できる申請操作ボタンを表示します。
 */
export function ApplicantApplicationActions({
  capabilities,
  canResendReturnEmail = false,
  editHref,
  resendReturnEmailAction,
  submitAction,
  resubmitAction,
}: ApplicantApplicationActionsProps) {
  if (
    !capabilities.canEditApplication &&
    !capabilities.canSubmitApplication &&
    !capabilities.canResubmitApplication &&
    !canResendReturnEmail
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {capabilities.canEditApplication ? (
          <Button asChild variant="outline">
            <Link href={editHref}>編集する</Link>
          </Button>
        ) : null}
        {capabilities.canSubmitApplication ? (
          <form action={submitAction}>
            <Button type="submit">提出する</Button>
          </form>
        ) : null}
        {canResendReturnEmail && resendReturnEmailAction ? (
          <form action={resendReturnEmailAction}>
            <Button type="submit" variant="outline">
              差し戻しメールを再送
            </Button>
          </form>
        ) : null}
      </div>
      {capabilities.canResubmitApplication ? (
        <form
          action={resubmitAction}
          className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
        >
          <Label htmlFor="resubmit-message">メッセージ（任意）</Label>
          <Textarea
            id="resubmit-message"
            name="message"
            placeholder="修正内容について補足があれば入力してください"
            rows={4}
            className="bg-white"
          />
          <Button type="submit" className="w-full">
            再提出する
          </Button>
        </form>
      ) : null}
    </div>
  );
}
