import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  resubmitAction: () => Promise<void>;
};

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
    <div className="flex gap-2">
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
      {capabilities.canResubmitApplication ? (
        <form action={resubmitAction}>
          <Button type="submit">再提出する</Button>
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
  );
}
