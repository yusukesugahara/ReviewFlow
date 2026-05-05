import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ApplicationCapabilities } from "../model/application-capabilities";
type ApplicantApplicationActionsProps = {
  capabilities: Pick<
    ApplicationCapabilities,
    "canEditApplication" | "canSubmitApplication" | "canResubmitApplication"
  >;
  editHref: string;
  submitAction: () => Promise<void>;
  resubmitAction: () => Promise<void>;
};

export function ApplicantApplicationActions({
  capabilities,
  editHref,
  submitAction,
  resubmitAction,
}: ApplicantApplicationActionsProps) {
  if (
    !capabilities.canEditApplication &&
    !capabilities.canSubmitApplication &&
    !capabilities.canResubmitApplication
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
    </div>
  );
}
